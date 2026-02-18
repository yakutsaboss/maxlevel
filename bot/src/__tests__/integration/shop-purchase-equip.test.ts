/**
 * Integration test: Shop browse → purchase with Stars/XP → inventory → equip avatar item
 *
 * Tests the complete purchase and equip flow through HTTP routes.
 * Mocks DB layer but exercises full Express HTTP route chain via supertest.
 *
 * NOTE: Uses vitest globals (no `import from 'vitest'`) — required for vitest 4.x with globals: true.
 */

import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../helpers/testApp.js';
import { getMockDb } from '../helpers/httpMocks.js';

// ─── Mocks (hoisted) ─────────────────────────────────────────────────

vi.mock('../../utils/db.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../utils/cache.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../utils/pythonTools.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../api/middleware/auth.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../api/middleware/rateLimiter.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Imports after mocks ──────────────────────────────────────────────

import { shopRouter } from '../../api/routes/shop.js';
import { inventoryRouter } from '../../api/routes/inventory.js';

// ─── Mock refs ────────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build integration test app ───────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/shop', shopRouter);
  app.use('/api/inventory', inventoryRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Shop → Purchase → Equip Integration Flow', () => {
  const app = buildApp();

  describe('Step 1: Browse Shop', () => {
    it('should list all active shop items', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 1, type: 'avatar_item', name: 'Golden Crown', description: 'A shiny crown',
          price_stars: 100, price_xp: 500, is_featured: true, is_active: true,
          rarity: 'legendary', icon_emoji: '👑', sort_order: 1, purchase_count: 42,
        },
        {
          id: 2, type: 'achievement', name: 'Early Bird Achievement', description: 'Unlock early bird',
          price_stars: 50, price_xp: 200, is_featured: false, is_active: true,
          rarity: 'rare', icon_emoji: '🐦', sort_order: 2, reference_id: 10, purchase_count: 15,
        },
      ]);

      const res = await request(app).get('/api/shop/items');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe('Golden Crown');
      expect(res.body.data[0].rarity).toBe('legendary');
    });

    it('should filter items by type', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 1, type: 'avatar_item', name: 'Golden Crown',
          price_stars: 100, price_xp: 500, is_featured: false, is_active: true,
          rarity: 'legendary', icon_emoji: '👑', sort_order: 1, purchase_count: 42,
        },
      ]);

      const res = await request(app).get('/api/shop/items?type=avatar_item');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('avatar_item');
    });

    it('should filter featured items', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 1, type: 'avatar_item', name: 'Golden Crown',
          price_stars: 100, price_xp: 500, is_featured: true, is_active: true,
          rarity: 'legendary', icon_emoji: '👑', sort_order: 1, purchase_count: 42,
        },
      ]);

      const res = await request(app).get('/api/shop/items?featured=true');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('should get single item details', async () => {
      db.queryOne.mockResolvedValueOnce({
        id: 1, type: 'avatar_item', name: 'Golden Crown', description: 'A shiny crown',
        price_stars: 100, price_xp: 500, is_featured: true, is_active: true,
        rarity: 'legendary', icon_emoji: '👑', sort_order: 1, purchase_count: 42,
      });

      const res = await request(app).get('/api/shop/items/1');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('Golden Crown');
      expect(res.body.data.purchase_count).toBe(42);
    });

    it('should return 404 for non-existent item', async () => {
      db.queryOne.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/shop/items/999');

      expect(res.status).toBe(404);
    });
  });

  describe('Step 2: Purchase with XP', () => {
    it('should purchase an avatar item with XP', async () => {
      // Verify user exists
      db.queryOne
        .mockResolvedValueOnce({ id: 1, total_xp: 1000 })
        // Verify item exists
        .mockResolvedValueOnce({
          id: 1, type: 'avatar_item', name: 'Golden Crown', price_stars: 100,
          price_xp: 500, is_active: true, rarity: 'legendary',
        })
        // Atomically deduct XP
        .mockResolvedValueOnce({ id: 1, total_xp: 500 })
        // Record purchase
        .mockResolvedValueOnce({
          id: 10, shop_item_id: 1, payment_method: 'xp', amount_paid: 500,
          purchased_at: '2026-02-18T12:00:00Z',
        })
        // Get updated balance
        .mockResolvedValueOnce({ total_xp: 500 });

      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1, itemId: 1, paymentMethod: 'xp' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.purchase.payment_method).toBe('xp');
      expect(res.body.data.purchase.amount_paid).toBe(500);
      expect(res.body.data.newBalance.xp).toBe(500);
    });

    it('should reject purchase with insufficient XP', async () => {
      db.queryOne
        .mockResolvedValueOnce({ id: 1, total_xp: 100 }) // user has 100 XP
        .mockResolvedValueOnce({
          id: 1, type: 'avatar_item', name: 'Golden Crown',
          price_stars: 100, price_xp: 500, is_active: true,
        })
        .mockResolvedValueOnce(null); // atomic deduct fails

      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1, itemId: 1, paymentMethod: 'xp' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Insufficient XP');
    });
  });

  describe('Step 3: Purchase with Stars', () => {
    it('should purchase an item with Stars', async () => {
      db.queryOne
        .mockResolvedValueOnce({ id: 1, total_xp: 1000 })
        .mockResolvedValueOnce({
          id: 1, type: 'avatar_item', name: 'Golden Crown',
          price_stars: 100, price_xp: 500, is_active: true,
        })
        .mockResolvedValueOnce({
          id: 11, shop_item_id: 1, payment_method: 'stars', amount_paid: 100,
          purchased_at: '2026-02-18T12:05:00Z',
        })
        .mockResolvedValueOnce({ total_xp: 1000 });

      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1, itemId: 1, paymentMethod: 'stars' });

      expect(res.status).toBe(200);
      expect(res.body.data.purchase.payment_method).toBe('stars');
      expect(res.body.data.newBalance.xp).toBe(1000); // XP unchanged
    });

    it('should reject duplicate achievement purchase', async () => {
      db.queryOne
        .mockResolvedValueOnce({ id: 1, total_xp: 1000 })
        .mockResolvedValueOnce({
          id: 2, type: 'achievement', name: 'Early Bird',
          price_stars: 50, price_xp: 200, is_active: true, reference_id: 10,
        })
        .mockResolvedValueOnce({ id: 99 }); // existing purchase found

      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1, itemId: 2, paymentMethod: 'stars' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already own');
    });

    it('should reject missing required fields', async () => {
      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1 });

      expect(res.status).toBe(400);
    });

    it('should reject invalid payment method', async () => {
      const res = await request(app)
        .post('/api/shop/purchase')
        .send({ userId: 1, itemId: 1, paymentMethod: 'bitcoin' });

      expect(res.status).toBe(400);
    });
  });

  describe('Step 4: Inventory', () => {
    it('should list user inventory grouped by type', async () => {
      db.query.mockResolvedValueOnce([
        {
          purchase_id: 10, shop_item_id: 1, name: 'Golden Crown', type: 'avatar_item',
          rarity: 'legendary', icon_emoji: '👑', is_equipped: false,
          payment_method: 'xp', amount_paid: 500, purchased_at: '2026-02-18',
        },
        {
          purchase_id: 11, shop_item_id: 2, name: 'Early Bird', type: 'achievement',
          rarity: 'rare', icon_emoji: '🐦', is_equipped: false,
          payment_method: 'stars', amount_paid: 50, purchased_at: '2026-02-18',
        },
      ]);

      const res = await request(app).get('/api/inventory/1');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(2);
      expect(res.body.data.totalCount).toBe(2);
      expect(res.body.data.grouped.avatar_item).toHaveLength(1);
      expect(res.body.data.grouped.achievement).toHaveLength(1);
    });

    it('should list purchase history', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 10, shop_item_id: 1, payment_method: 'xp', amount_paid: 500,
          purchased_at: '2026-02-18', item_name: 'Golden Crown',
          item_type: 'avatar_item', item_icon: '👑',
        },
      ]);

      const res = await request(app).get('/api/shop/purchases/1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].item_name).toBe('Golden Crown');
    });
  });

  describe('Step 5: Equip / Unequip Avatar Item', () => {
    it('should equip an avatar item', async () => {
      // Verify ownership
      db.queryOne.mockResolvedValueOnce({
        purchase_id: 10, shop_item_id: 1, type: 'avatar_item', is_equipped: false,
      });
      // Unequip all old avatar items
      db.query.mockResolvedValueOnce([]);
      // Equip the new one
      db.query.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/inventory/1/equip')
        .send({ itemId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.equipped).toBe(true);
      expect(res.body.data.itemId).toBe(1);
    });

    it('should reject equipping non-avatar item', async () => {
      db.queryOne.mockResolvedValueOnce({
        purchase_id: 11, shop_item_id: 2, type: 'achievement', is_equipped: false,
      });

      const res = await request(app)
        .post('/api/inventory/1/equip')
        .send({ itemId: 2 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Only avatar items');
    });

    it('should reject equipping already-equipped item', async () => {
      db.queryOne.mockResolvedValueOnce({
        purchase_id: 10, shop_item_id: 1, type: 'avatar_item', is_equipped: true,
      });

      const res = await request(app)
        .post('/api/inventory/1/equip')
        .send({ itemId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already equipped');
    });

    it('should reject equipping non-owned item', async () => {
      db.queryOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/inventory/1/equip')
        .send({ itemId: 999 });

      expect(res.status).toBe(404);
    });

    it('should unequip an avatar item', async () => {
      db.queryOne.mockResolvedValueOnce({
        purchase_id: 10, shop_item_id: 1, type: 'avatar_item', is_equipped: true,
      });
      db.query.mockResolvedValueOnce([]);

      const res = await request(app)
        .post('/api/inventory/1/unequip')
        .send({ itemId: 1 });

      expect(res.status).toBe(200);
      expect(res.body.data.equipped).toBe(false);
      expect(res.body.data.itemId).toBe(1);
    });

    it('should reject unequipping non-equipped item', async () => {
      db.queryOne.mockResolvedValueOnce({
        purchase_id: 10, shop_item_id: 1, type: 'avatar_item', is_equipped: false,
      });

      const res = await request(app)
        .post('/api/inventory/1/unequip')
        .send({ itemId: 1 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('not currently equipped');
    });

    it('should reject equip with missing itemId', async () => {
      const res = await request(app)
        .post('/api/inventory/1/equip')
        .send({});

      expect(res.status).toBe(400);
    });
  });
});
