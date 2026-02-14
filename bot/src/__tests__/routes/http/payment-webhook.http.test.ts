/**
 * HTTP integration tests for payment webhook route (bot/src/api/routes/payment-webhook.ts)
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

vi.mock('../../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('../../../utils/paymentHelpers.js', async () => {
  const { UnauthorizedError } = await import('../../../api/utils/errors.js');
  return {
    TIER_PRICES: { free: 0, subscriber: 0, premium: 599 },
    VALID_TIERS: ['free', 'subscriber', 'premium'],
    isValidTier: (t: string) => ['free', 'subscriber', 'premium'].includes(t),
    isPositiveInteger: (n: number) => Number.isInteger(n) && n > 0,
    Tier: {},
    verifyWebhookSecret: (req: any) => {
      const secret = req.headers['x-telegram-bot-api-secret-token'];
      const expected = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_BOT_TOKEN;
      if (!secret) throw new UnauthorizedError('Missing webhook secret token');
      if (secret !== expected) throw new UnauthorizedError('Invalid webhook secret token');
    },
  };
});

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { webhookRouter } from '../../../api/routes/payment-webhook.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/payments/webhook', webhookRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Helpers ────────────────────────────────────────────────────────

const VALID_SECRET = 'test-bot-token';
const VALID_HEADERS = { 'x-telegram-bot-api-secret-token': VALID_SECRET };

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    telegram_payment_charge_id: 'tg_charge_123',
    provider_payment_charge_id: 'prov_456',
    payment_id: 42,
    ...overrides,
  };
}

function pendingPayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    user_id: 1,
    amount: '100',
    status: 'pending',
    metadata: { tier: 'premium' },
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  process.env.TELEGRAM_BOT_TOKEN = VALID_SECRET;
});

describe('POST /api/payments/webhook', () => {
  // ─── Auth / Secret verification ───────────────────────────────────

  it('should return 401 when webhook secret header is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .send(validPayload())
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing webhook secret');
  });

  it('should return 401 when webhook secret is incorrect', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set('x-telegram-bot-api-secret-token', 'wrong-secret')
      .send(validPayload())
      .expect(401);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid webhook secret');
  });

  // ─── Payload validation ───────────────────────────────────────────

  it('should return 400 when telegram_payment_charge_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send({ payment_id: 42 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('telegram_payment_charge_id');
  });

  it('should return 400 when payment_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send({ telegram_payment_charge_id: 'tg_123' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('payment_id');
  });

  // ─── Payment lookup ───────────────────────────────────────────────

  it('should return 404 when payment does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload({ payment_id: 999 }))
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  // ─── Idempotent re-processing ─────────────────────────────────────

  it('should return 200 idempotently for already completed payment', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment({ status: 'completed' }));

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.message).toContain('already processed');
    // Transaction should NOT be called for idempotent re-processing
    expect(db.transaction).not.toHaveBeenCalled();
  });

  // ─── Invalid payment state ────────────────────────────────────────

  it('should return 400 when payment is in failed state', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment({ status: 'failed' }));

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('failed');
  });

  it('should return 400 when payment is in refunded state', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment({ status: 'refunded' }));

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('refunded');
  });

  // ─── Successful processing ────────────────────────────────────────

  it('should return 200 and complete a pending payment', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment());
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return fn(client);
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.payment_id).toBe(42);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.subscription_tier).toBe('premium');
    expect(res.body.data.expires_at).toBeDefined();
  });

  it('should call transaction with payment update and subscription upsert', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment());
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
    db.transaction.mockImplementationOnce(async (fn: any) => {
      return fn({ query: clientQuery });
    });

    await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(200);

    // Transaction was called
    expect(db.transaction).toHaveBeenCalledOnce();

    // Client.query called twice: once for payment update, once for subscription upsert
    expect(clientQuery).toHaveBeenCalledTimes(2);

    // First call: UPDATE payments
    const paymentUpdateSql = clientQuery.mock.calls[0][0] as string;
    expect(paymentUpdateSql).toContain('UPDATE payments');
    expect(paymentUpdateSql).toContain('status');

    // Second call: INSERT INTO subscriptions (upsert)
    const subscriptionSql = clientQuery.mock.calls[1][0] as string;
    expect(subscriptionSql).toContain('subscriptions');
  });

  it('should use tier from payment metadata', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment({ metadata: { tier: 'subscriber' } }));
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return fn(client);
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(200);

    expect(res.body.data.subscription_tier).toBe('subscriber');
  });

  it('should default to premium tier when metadata has no tier', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment({ metadata: {} }));
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      return fn(client);
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send(validPayload())
      .expect(200);

    expect(res.body.data.subscription_tier).toBe('premium');
  });

  it('should handle missing provider_payment_charge_id gracefully', async () => {
    db.queryOne.mockResolvedValueOnce(pendingPayment());
    const clientQuery = vi.fn().mockResolvedValue({ rows: [] });
    db.transaction.mockImplementationOnce(async (fn: any) => {
      return fn({ query: clientQuery });
    });

    const res = await request(buildApp())
      .post('/api/payments/webhook')
      .set(VALID_HEADERS)
      .send({ telegram_payment_charge_id: 'tg_123', payment_id: 42 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
  });
});
