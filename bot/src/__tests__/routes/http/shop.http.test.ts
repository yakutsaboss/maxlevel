/**
 * HTTP integration tests for shop routes (bot/src/api/routes/shop.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 68 Agent E: Tests for GET /shop/items, GET /shop/items/:itemId,
 * POST /shop/purchase, GET /shop/purchases/:userId
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

import { shopRouter } from '../../../api/routes/shop.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/shop', shopRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ──────────────────────────────────────────────────────

const mockShopItems = [
  {
    id: 1, type: 'achievement', reference_id: 101, name: 'Golden Collector',
    description: 'A premium golden achievement', price_stars: 50, price_xp: 0,
    is_featured: true, is_active: true, rarity: 'rare', icon_emoji: '🏅',
    sort_order: 1, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 2, type: 'achievement', reference_id: 102, name: 'Diamond Streak',
    description: 'Diamond-level streak achievement', price_stars: 100, price_xp: 0,
    is_featured: false, is_active: true, rarity: 'epic', icon_emoji: '💎',
    sort_order: 2, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 3, type: 'avatar_item', reference_id: 201, name: 'Premium Hairstyle',
    description: 'An exclusive hairstyle', price_stars: 30, price_xp: 200,
    is_featured: false, is_active: true, rarity: 'rare', icon_emoji: '💇',
    sort_order: 3, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 4, type: 'xp_booster', reference_id: null, name: 'XP Doubler 24h',
    description: 'Double XP for 24 hours', price_stars: 30, price_xp: 500,
    is_featured: true, is_active: true, rarity: 'common', icon_emoji: '⚡',
    sort_order: 4, created_at: '2026-02-01T00:00:00Z',
  },
];

const mockPurchases = [
  {
    id: 1, user_id: 1, shop_item_id: 1, payment_method: 'stars',
    amount_paid: 50, purchased_at: '2026-02-10T12:00:00Z',
    name: 'Golden Collector', icon_emoji: '🏅',
  },
];

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/shop/items ───────────────────────────────────────────

describe('GET /api/shop/items', () => {
  it('should return all active shop items', async () => {
    db.query.mockResolvedValueOnce(mockShopItems);

    const res = await request(buildApp())
      .get('/api/shop/items')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(4);
    expect(res.body.data[0].name).toBe('Golden Collector');
    expect(res.body.data[0].icon_emoji).toBe('🏅');
  });

  it('should filter items by type', async () => {
    const achievements = mockShopItems.filter(i => i.type === 'achievement');
    db.query.mockResolvedValueOnce(achievements);

    const res = await request(buildApp())
      .get('/api/shop/items?type=achievement')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((i: any) => i.type === 'achievement')).toBe(true);
  });

  it('should filter items by featured', async () => {
    const featured = mockShopItems.filter(i => i.is_featured);
    db.query.mockResolvedValueOnce(featured);

    const res = await request(buildApp())
      .get('/api/shop/items?featured=true')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((i: any) => i.is_featured)).toBe(true);
  });

  it('should return empty array when no items exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/shop/items')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/shop/items')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/shop/items/:itemId ───────────────────────────────────

describe('GET /api/shop/items/:itemId', () => {
  it('should return item details', async () => {
    db.queryOne.mockResolvedValueOnce(mockShopItems[0]);

    const res = await request(buildApp())
      .get('/api/shop/items/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Golden Collector');
    expect(res.body.data.price_stars).toBe(50);
    expect(res.body.data.rarity).toBe('rare');
  });

  it('should return 404 for non-existent item', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/shop/items/999')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid itemId', async () => {
    const res = await request(buildApp())
      .get('/api/shop/items/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/shop/items/1')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/shop/purchase ───────────────────────────────────────

describe('POST /api/shop/purchase', () => {
  const purchaseBody = { userId: 1, itemId: 1, paymentMethod: 'stars' };

  it('should complete a successful Stars purchase', async () => {
    // queryOne 1: verify user exists (SELECT id, total_xp FROM users)
    db.queryOne.mockResolvedValueOnce({ id: 1, total_xp: 500 });
    // queryOne 2: verify item exists (SELECT * FROM shop_items)
    db.queryOne.mockResolvedValueOnce(mockShopItems[0]);
    // queryOne 3: check for duplicate purchase (achievement type → check)
    db.queryOne.mockResolvedValueOnce(null);
    // queryOne 4: insert purchase RETURNING
    db.queryOne.mockResolvedValueOnce({
      id: 1, shop_item_id: 1,
      payment_method: 'stars', amount_paid: 50,
      purchased_at: '2026-02-15T12:00:00Z',
    });
    // queryOne 5: unlock achievement (INSERT INTO user_achievements ON CONFLICT DO NOTHING)
    db.queryOne.mockResolvedValueOnce(null);
    // queryOne 6: get updated balance (SELECT total_xp FROM users)
    db.queryOne.mockResolvedValueOnce({ total_xp: 500 });

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send(purchaseBody)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.purchase.payment_method).toBe('stars');
    expect(res.body.data.purchase.amount_paid).toBe(50);
  });

  it('should complete a successful XP purchase', async () => {
    const xpItem = mockShopItems[3]; // XP Doubler, price_xp: 500, type: xp_booster
    // queryOne 1: verify user exists
    db.queryOne.mockResolvedValueOnce({ id: 1, total_xp: 1000 });
    // queryOne 2: verify item exists
    db.queryOne.mockResolvedValueOnce(xpItem);
    // (no duplicate check — xp_booster is not 'achievement' type)
    // queryOne 3: deduct XP atomically (UPDATE users SET total_xp = total_xp - $1 ... RETURNING)
    db.queryOne.mockResolvedValueOnce({ id: 1, total_xp: 500 });
    // queryOne 4: insert purchase
    db.queryOne.mockResolvedValueOnce({
      id: 2, shop_item_id: 4,
      payment_method: 'xp', amount_paid: 500,
      purchased_at: '2026-02-15T12:00:00Z',
    });
    // (no achievement unlock — xp_booster type)
    // queryOne 5: get updated balance
    db.queryOne.mockResolvedValueOnce({ total_xp: 500 });

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send({ userId: 1, itemId: 4, paymentMethod: 'xp' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.purchase.payment_method).toBe('xp');
  });

  it('should reject purchase with insufficient XP balance', async () => {
    const xpItem = mockShopItems[3]; // XP Doubler, price_xp: 500
    // queryOne 1: verify user exists
    db.queryOne.mockResolvedValueOnce({ id: 1, total_xp: 100 });
    // queryOne 2: verify item exists
    db.queryOne.mockResolvedValueOnce(xpItem);
    // (no duplicate check — xp_booster is not 'achievement' type)
    // queryOne 3: atomic XP deduct fails (returns null when total_xp < amount)
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send({ userId: 1, itemId: 4, paymentMethod: 'xp' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject duplicate purchase for one-time items (achievements)', async () => {
    // queryOne 1: verify user exists
    db.queryOne.mockResolvedValueOnce({ id: 1, total_xp: 500 });
    // queryOne 2: verify item exists (achievement type)
    db.queryOne.mockResolvedValueOnce(mockShopItems[0]);
    // queryOne 3: duplicate check — existing purchase found
    db.queryOne.mockResolvedValueOnce({ id: 1 });

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send(purchaseBody)
      .expect(409);

    expect(res.body.success).toBe(false);
  });

  it('should reject purchase for non-existent item', async () => {
    db.queryOne.mockResolvedValueOnce(null); // item not found

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send({ userId: 1, itemId: 999, paymentMethod: 'stars' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should reject purchase with missing fields', async () => {
    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should reject purchase with invalid payment method', async () => {
    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send({ userId: 1, itemId: 1, paymentMethod: 'bitcoin' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/shop/purchase')
      .send(purchaseBody)
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/shop/purchases/:userId ───────────────────────────────

describe('GET /api/shop/purchases/:userId', () => {
  it('should return purchase history for a user', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // user existence check
    db.query.mockResolvedValueOnce(mockPurchases);

    const res = await request(buildApp())
      .get('/api/shop/purchases/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Golden Collector');
    expect(res.body.data[0].payment_method).toBe('stars');
    expect(res.body.data[0].amount_paid).toBe(50);
  });

  it('should return empty array for user with no purchases', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 999 }); // user exists
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/shop/purchases/999')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(buildApp())
      .get('/api/shop/purchases/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/shop/purchases/1')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});
