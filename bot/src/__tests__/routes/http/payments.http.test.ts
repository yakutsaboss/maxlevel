/**
 * HTTP integration tests for payment routes (bot/src/api/routes/payments.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
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

import { paymentsRouter } from '../../../api/routes/payments.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/payments', paymentsRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  // Provide a default webhook secret for webhook tests
  process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';
});

// ─── POST /api/payments/create ──────────────────────────────────────

describe('POST /api/payments/create', () => {
  it('should return 201 and create a pending payment', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    // Payment inserted
    db.queryOne.mockResolvedValueOnce({ id: 42, status: 'pending', created_at: '2026-02-12T10:00:00Z' });

    const res = await request(buildApp())
      .post('/api/payments/create')
      .send({ userId: 1, amount: 100, tier: 'pro' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payment_id).toBe(42);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.amount).toBe(100);
    expect(res.body.data.currency).toBe('XTR');
    expect(res.body.data.provider).toBe('telegram_stars');
    expect(res.body.data.tier).toBe('pro');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create')
      .send({ userId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid tier (free)', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create')
      .send({ userId: 1, amount: 100, tier: 'free' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid tier');
  });

  it('should return 400 for negative amount', async () => {
    const res = await request(buildApp())
      .post('/api/payments/create')
      .send({ userId: 1, amount: -5, tier: 'pro' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('positive number');
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null); // user not found

    const res = await request(buildApp())
      .post('/api/payments/create')
      .send({ userId: 999, amount: 100, tier: 'premium' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });
});

// ─── POST /api/payments/webhook ─────────────────────────────────────

describe('POST /api/payments/webhook', () => {
  it('should return 200 and complete a pending payment', async () => {
    // Pending payment found
    db.queryOne.mockResolvedValueOnce({
      id: 42, user_id: 1, amount: '100', status: 'pending', metadata: { tier: 'pro' },
    });
    // Transaction mock
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return fn(client);
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'test-bot-token')
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 42 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payment_id).toBe(42);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.subscription_tier).toBe('pro');
  });

  it('should return 401 when secret token is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 42 })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing webhook secret');
  });

  it('should return 401 when secret token is wrong', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'wrong-token')
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 42 })
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid webhook secret');
  });

  it('should return 400 when telegram_payment_charge_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'test-bot-token')
      .send({ payment_id: 42 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('telegram_payment_charge_id');
  });

  it('should return 404 when payment does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'test-bot-token')
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 999 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('should return 200 idempotently for already completed payment', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 42, user_id: 1, amount: '100', status: 'completed', metadata: { tier: 'pro' },
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'test-bot-token')
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 42 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.message).toContain('already processed');
  });
});

// ─── GET /api/payments/history/:userId ──────────────────────────────

describe('GET /api/payments/history/:userId', () => {
  it('should return 200 with payment history', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, amount: '100', currency: 'XTR', status: 'completed', provider: 'telegram_stars', created_at: '2026-02-10' },
      { id: 2, amount: '200', currency: 'XTR', status: 'pending', provider: 'telegram_stars', created_at: '2026-02-11' },
    ]);

    const res = await request(buildApp())
      .get('/api/payments/history/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payments).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
  });

  it('should return 400 for non-numeric userId', async () => {
    const res = await request(buildApp())
      .get('/api/payments/history/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid userId');
  });

  it('should return empty array when no payments exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/payments/history/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payments).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });
});

// ─── GET /api/payments/subscription/:userId ─────────────────────────

describe('GET /api/payments/subscription/:userId', () => {
  it('should return 200 with active subscription', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    db.queryOne.mockResolvedValueOnce({
      id: 1, tier: 'pro', started_at: '2026-02-01', expires_at: futureDate, auto_renew: true, updated_at: '2026-02-01',
    });

    const res = await request(buildApp())
      .get('/api/payments/subscription/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('pro');
    expect(res.body.data.is_active).toBe(true);
    expect(res.body.data.is_expired).toBe(false);
  });

  it('should return free tier when no subscription exists', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/payments/subscription/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('free');
    expect(res.body.data.is_active).toBe(true);
  });

  it('should return expired subscription as free tier', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    db.queryOne.mockResolvedValueOnce({
      id: 1, tier: 'premium', started_at: '2026-01-01', expires_at: pastDate, auto_renew: false, updated_at: '2026-01-01',
    });

    const res = await request(buildApp())
      .get('/api/payments/subscription/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('free');
    expect(res.body.data.is_active).toBe(false);
    expect(res.body.data.is_expired).toBe(true);
    expect(res.body.data.raw_tier).toBe('premium');
  });

  it('should return 400 for non-numeric userId', async () => {
    const res = await request(buildApp())
      .get('/api/payments/subscription/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid userId');
  });
});

// ─── POST /api/payments/subscription/upgrade ────────────────────────

describe('POST /api/payments/subscription/upgrade', () => {
  it('should return 200 and upgrade subscription', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // user exists
    db.queryOne.mockResolvedValueOnce({ id: 5, tier: 'premium', expires_at: '2026-03-14' }); // upsert result

    const res = await request(buildApp())
      .post('/api/payments/subscription/upgrade')
      .send({ userId: 1, tier: 'premium' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.subscription_id).toBe(5);
    expect(res.body.data.tier).toBe('premium');
  });

  it('should return 400 when required fields are missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/subscription/upgrade')
      .send({ userId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid tier (free)', async () => {
    const res = await request(buildApp())
      .post('/api/payments/subscription/upgrade')
      .send({ userId: 1, tier: 'free' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot upgrade to tier');
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/payments/subscription/upgrade')
      .send({ userId: 999, tier: 'pro' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });
});

// ─── POST /api/payments/subscription/cancel ─────────────────────────

describe('POST /api/payments/subscription/cancel', () => {
  it('should return 200 and cancel active subscription', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1, tier: 'pro' }); // existing sub
    db.execute.mockResolvedValueOnce(1); // update row

    const res = await request(buildApp())
      .post('/api/payments/subscription/cancel')
      .send({ userId: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.previous_tier).toBe('pro');
    expect(res.body.data.tier).toBe('free');
    expect(res.body.data.auto_renew).toBe(false);
  });

  it('should return 200 when no active subscription exists', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/payments/subscription/cancel')
      .send({ userId: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('free');
    expect(res.body.message).toContain('No active subscription');
  });

  it('should return 400 when userId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/subscription/cancel')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required field');
  });

  it('should return 400 for invalid userId', async () => {
    const res = await request(buildApp())
      .post('/api/payments/subscription/cancel')
      .send({ userId: -1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('positive integer');
  });
});
