/**
 * HTTP integration tests for avatar routes (bot/src/api/routes/avatars.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 66 Agent E: Tests for GET /items, GET /:userId, PATCH /:userId/equip
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb, getMockCache } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { avatarRouter } from '../../../api/routes/avatars.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/avatars', avatarRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/avatars/items ─────────────────────────────────────────

describe('GET /api/avatars/items', () => {
  it('should return all avatar items', async () => {
    const mockItems = [
      { id: 1, category: 'hairstyle', name: 'Spiky', sprite_key: 'hair-spiky', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
      { id: 2, category: 'outfit', name: 'T-Shirt', sprite_key: 'outfit-tshirt', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
      { id: 3, category: 'accessory', name: 'Glasses', sprite_key: 'acc-glasses', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
      { id: 4, category: 'background', name: 'Default', sprite_key: 'bg-default', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
    ];
    db.query.mockResolvedValueOnce(mockItems);

    const res = await request(buildApp())
      .get('/api/avatars/items')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0].sprite_key).toBe('hair-spiky');
  });

  it('should return empty array when no items exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/avatars/items')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/avatars/items')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/avatars/:userId ───────────────────────────────────────

describe('GET /api/avatars/:userId', () => {
  it('should return saved equipped items for existing user', async () => {
    const equipped = { hairstyle: 'hair-spiky', outfit: 'outfit-armor', accessory: null, background: 'bg-sunset' };
    // First queryOne: resolve telegram_id → DB user_id
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    // Second queryOne: fetch equipped_items from user_avatar
    db.queryOne.mockResolvedValueOnce({ equipped_items: equipped });

    const res = await request(buildApp())
      .get('/api/avatars/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.hairstyle).toBe('hair-spiky');
    expect(res.body.data.outfit).toBe('outfit-armor');
    expect(res.body.data.accessory).toBeNull();
    expect(res.body.data.background).toBe('bg-sunset');
  });

  it('should return default equipped items for new user (no avatar row)', async () => {
    // First queryOne: user exists
    db.queryOne.mockResolvedValueOnce({ id: 999 });
    // Second queryOne: no avatar row
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/avatars/999')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({
      hairstyle: null,
      outfit: null,
      accessory: null,
      background: null,
    });
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/avatars/1')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── PATCH /api/avatars/:userId/equip ───────────────────────────────

describe('PATCH /api/avatars/:userId/equip', () => {
  it('should equip an item and return updated equipped items', async () => {
    const updatedEquipped = { hairstyle: 'hair-mohawk', outfit: null, accessory: null, background: null };
    // First queryOne: resolve telegram_id → DB user_id
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    // Second queryOne: verify item exists
    db.queryOne.mockResolvedValueOnce({ id: 3, category: 'hairstyle', sprite_key: 'hair-mohawk' });
    // Third queryOne: UPSERT returns
    db.queryOne.mockResolvedValueOnce({ equipped_items: updatedEquipped });

    const res = await request(buildApp())
      .patch('/api/avatars/1/equip')
      .send({ category: 'hairstyle', itemId: 3 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.hairstyle).toBe('hair-mohawk');
  });

  it('should unequip an item when itemId is null', async () => {
    const updatedEquipped = { hairstyle: null, outfit: null, accessory: null, background: null };
    // First queryOne: resolve telegram_id → DB user_id
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    // Second queryOne: UPSERT returns (no item verification needed for null)
    db.queryOne.mockResolvedValueOnce({ equipped_items: updatedEquipped });

    const res = await request(buildApp())
      .patch('/api/avatars/1/equip')
      .send({ category: 'hairstyle', itemId: null })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.hairstyle).toBeNull();
  });

  it('should reject invalid category', async () => {
    // First queryOne: resolve telegram_id → DB user_id
    db.queryOne.mockResolvedValueOnce({ id: 1 });

    const res = await request(buildApp())
      .patch('/api/avatars/1/equip')
      .send({ category: 'weapon', itemId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject when category is missing', async () => {
    // First queryOne: resolve telegram_id → DB user_id
    db.queryOne.mockResolvedValueOnce({ id: 1 });

    const res = await request(buildApp())
      .patch('/api/avatars/1/equip')
      .send({ itemId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .patch('/api/avatars/1/equip')
      .send({ category: 'hairstyle', itemId: 1 })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});
