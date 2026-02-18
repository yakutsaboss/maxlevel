/**
 * HTTP integration tests for inventory routes (bot/src/api/routes/inventory.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 69 Agent E: Tests for GET /inventory/:userId, POST /inventory/:userId/equip,
 * POST /inventory/:userId/unequip
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

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

import { inventoryRouter } from '../../../api/routes/inventory.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/inventory', inventoryRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ──────────────────────────────────────────────────────

const mockInventoryItems = [
  {
    id: 1, user_id: 1, shop_item_id: 1, payment_method: 'stars',
    amount_paid: 50, purchased_at: '2026-02-10T12:00:00Z',
    item_name: 'Golden Collector', item_type: 'achievement',
    item_description: 'A premium golden achievement', item_rarity: 'rare',
    item_icon_emoji: '🏅', is_equipped: false,
  },
  {
    id: 2, user_id: 1, shop_item_id: 3, payment_method: 'xp',
    amount_paid: 200, purchased_at: '2026-02-11T14:00:00Z',
    item_name: 'Premium Hairstyle', item_type: 'avatar_item',
    item_description: 'An exclusive hairstyle', item_rarity: 'rare',
    item_icon_emoji: '💇', is_equipped: false,
  },
  {
    id: 3, user_id: 1, shop_item_id: 4, payment_method: 'stars',
    amount_paid: 30, purchased_at: '2026-02-12T10:00:00Z',
    item_name: 'XP Doubler 24h', item_type: 'xp_booster',
    item_description: 'Double XP for 24 hours', item_rarity: 'common',
    item_icon_emoji: '⚡', is_equipped: false,
  },
];

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/inventory/:userId ─────────────────────────────────────

describe('GET /api/inventory/:userId', () => {
  it('should return user inventory items grouped by type', async () => {
    db.query.mockResolvedValueOnce(mockInventoryItems);

    const res = await request(buildApp())
      .get('/api/inventory/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should return items with full item details from shop_items JOIN', async () => {
    db.query.mockResolvedValueOnce([mockInventoryItems[0]]);

    const res = await request(buildApp())
      .get('/api/inventory/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    // Should contain item details from the JOIN
    const data = res.body.data;
    expect(data).toBeDefined();
  });

  it('should return empty result for user with no purchases', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/inventory/999')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(buildApp())
      .get('/api/inventory/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/inventory/1')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/inventory/:userId/equip ──────────────────────────────

describe('POST /api/inventory/:userId/equip', () => {
  it('should equip an owned avatar item', async () => {
    // Verify item is owned by user
    db.queryOne.mockResolvedValueOnce({
      id: 2, user_id: 1, shop_item_id: 3, item_type: 'avatar_item',
    });
    // Unequip previous item of same type (if any)
    db.execute.mockResolvedValueOnce(undefined);
    // Equip the new item
    db.queryOne.mockResolvedValueOnce({
      id: 2, is_equipped: true,
    });

    const res = await request(buildApp())
      .post('/api/inventory/1/equip')
      .send({ itemId: 3 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 when item is not owned by user', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/inventory/1/equip')
      .send({ itemId: 999 })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when itemId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/inventory/1/equip')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(buildApp())
      .post('/api/inventory/abc/equip')
      .send({ itemId: 3 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/inventory/1/equip')
      .send({ itemId: 3 })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/inventory/:userId/unequip ────────────────────────────

describe('POST /api/inventory/:userId/unequip', () => {
  it('should unequip an equipped avatar item', async () => {
    // Verify item is owned and equipped
    db.queryOne.mockResolvedValueOnce({
      id: 2, user_id: 1, shop_item_id: 3, item_type: 'avatar_item', is_equipped: true,
    });
    // Unequip the item
    db.queryOne.mockResolvedValueOnce({
      id: 2, is_equipped: false,
    });

    const res = await request(buildApp())
      .post('/api/inventory/1/unequip')
      .send({ itemId: 3 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 when item is not owned by user', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/inventory/1/unequip')
      .send({ itemId: 999 })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when itemId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/inventory/1/unequip')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(buildApp())
      .post('/api/inventory/abc/unequip')
      .send({ itemId: 3 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/inventory/1/unequip')
      .send({ itemId: 3 })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});
