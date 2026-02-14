/**
 * Tests for Grammy payment event handlers (bot/src/handlers/payments.ts)
 *
 * Tests: handlePreCheckout (pre_checkout_query validation + approval/rejection),
 *        handleSuccessfulPayment (DB update, subscription upsert, confirmation message)
 * Mocks: db (queryOne, execute), Grammy context
 *
 * Agent A creates the handlers in Run 60. These tests validate the expected
 * behavior of pre_checkout_query and message:successful_payment events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockQuery = vi.fn();
const mockClientQuery = vi.fn().mockResolvedValue({ rows: [] });

const mockTransaction = vi.fn(async (cb: (client: any) => Promise<void>) => {
  const mockClient = { query: mockClientQuery };
  await cb(mockClient);
});

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  getPool: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('../../utils/paymentHelpers.js', () => ({
  TIER_PRICES: { free: 0, subscriber: 0, premium: 599 },
  VALID_TIERS: ['free', 'subscriber', 'premium'],
  isValidTier: (t: string) => ['free', 'subscriber', 'premium'].includes(t),
  isPositiveInteger: (n: number) => Number.isInteger(n) && n > 0,
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handlePreCheckoutQuery, handleSuccessfulPayment } from '../../handlers/payments.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createPreCheckoutCtx(overrides: Record<string, any> = {}) {
  const defaultPreCheckout = {
    id: 'precheckout_123',
    currency: 'XTR',
    total_amount: 599,
    invoice_payload: JSON.stringify({ payment_id: 100, tier: 'premium' }),
    ...overrides,
  };

  return {
    preCheckoutQuery: defaultPreCheckout,
    from: { id: 123456789, first_name: 'TestUser' },
    answerPreCheckoutQuery: vi.fn(),
    reply: vi.fn(),
  } as any;
}

function createSuccessfulPaymentCtx(overrides: Record<string, any> = {}) {
  const defaultPayment = {
    currency: 'XTR',
    total_amount: 599,
    invoice_payload: JSON.stringify({ payment_id: 100, tier: 'premium' }),
    telegram_payment_charge_id: 'charge_abc123',
    provider_payment_charge_id: 'provider_xyz789',
    ...overrides,
  };

  return {
    from: { id: 123456789, first_name: 'TestUser' },
    message: {
      successful_payment: defaultPayment,
    },
    reply: vi.fn(),
  } as any;
}

// ─── Tests: handlePreCheckout ───────────────────────────────────────

describe('handlePreCheckoutQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should approve valid payment with correct payload and amount', async () => {
    // Payment record exists in DB with matching amount
    mockQueryOne.mockResolvedValueOnce({ id: 100, amount: '599', status: 'pending' });

    const ctx = createPreCheckoutCtx();
    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(true);
  });

  it('should reject payment with invalid JSON payload', async () => {
    const ctx = createPreCheckoutCtx({
      invoice_payload: 'not-valid-json',
    });

    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        error_message: expect.any(String),
      }),
    );
  });

  it('should reject payment with missing payment_id in payload', async () => {
    const ctx = createPreCheckoutCtx({
      invoice_payload: JSON.stringify({ tier: 'premium' }),
    });

    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        error_message: expect.any(String),
      }),
    );
  });

  it('should reject payment when payment record not found in DB', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const ctx = createPreCheckoutCtx();
    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        error_message: expect.any(String),
      }),
    );
  });

  it('should reject payment with mismatched amount', async () => {
    // DB says 599 but pre_checkout says 999
    mockQueryOne.mockResolvedValueOnce({ id: 100, amount: '599', status: 'pending' });

    const ctx = createPreCheckoutCtx({ total_amount: 999 });
    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledWith(
      false,
      expect.objectContaining({
        error_message: expect.any(String),
      }),
    );
  });

  it('should call answerPreCheckoutQuery exactly once', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 100, amount: '599', status: 'pending' });

    const ctx = createPreCheckoutCtx();
    await handlePreCheckoutQuery(ctx);

    expect(ctx.answerPreCheckoutQuery).toHaveBeenCalledTimes(1);
  });

  it('should propagate DB errors (Grammy error handler catches them)', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB connection lost'));

    const ctx = createPreCheckoutCtx();
    // The handler doesn't have internal try-catch for DB errors —
    // Grammy's bot.catch() handles it at the framework level
    await expect(handlePreCheckoutQuery(ctx)).rejects.toThrow('DB connection lost');
  });
});

// ─── Tests: handleSuccessfulPayment ─────────────────────────────────

describe('handleSuccessfulPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update payment status to completed in DB', async () => {
    // Payment record found
    mockQueryOne.mockResolvedValueOnce({ id: 100, user_id: 1, amount: '599', status: 'pending', metadata: { tier: 'premium' } });

    const ctx = createSuccessfulPaymentCtx();
    await handleSuccessfulPayment(ctx);

    // Verify transaction was called
    expect(mockTransaction).toHaveBeenCalledTimes(1);
    // Verify client.query was called with 'completed' status update
    const updateCall = mockClientQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('completed'),
    );
    expect(updateCall).toBeTruthy();
  });

  it('should upsert subscription with correct tier', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 100, user_id: 1, amount: '599', status: 'pending', metadata: { tier: 'premium' } });

    const ctx = createSuccessfulPaymentCtx();
    await handleSuccessfulPayment(ctx);

    // Should have called client.query for subscription upsert inside transaction
    const subscriptionCall = mockClientQuery.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].toLowerCase().includes('subscription'),
    );
    expect(subscriptionCall).toBeTruthy();
  });

  it('should send confirmation message to user', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 100, user_id: 1, amount: '599', status: 'pending', metadata: { tier: 'premium' } });

    const ctx = createSuccessfulPaymentCtx();
    await handleSuccessfulPayment(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const replyText = ctx.reply.mock.calls[0][0] as string;
    // Confirmation should mention success or premium
    expect(replyText).toMatch(/premium|success|payment|thank/i);
  });

  it('should handle missing payment record gracefully', async () => {
    // Payment not found in DB
    mockQueryOne.mockResolvedValueOnce(null);

    const ctx = createSuccessfulPaymentCtx();

    // Should not throw
    await expect(handleSuccessfulPayment(ctx)).resolves.not.toThrow();

    // Should still reply (error or warning message)
    expect(ctx.reply).toHaveBeenCalled();
  });

  it('should extract telegram_payment_charge_id from successful_payment', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 100, user_id: 1, amount: '599', status: 'pending', metadata: { tier: 'premium' } });

    const ctx = createSuccessfulPaymentCtx({
      telegram_payment_charge_id: 'custom_charge_id',
      provider_payment_charge_id: 'custom_provider_id',
    });
    await handleSuccessfulPayment(ctx);

    // The charge ID should appear in the client.query update call args
    const clientQueryArgs = mockClientQuery.mock.calls.flat();
    const hasChargeId = clientQueryArgs.some(
      (arg: any) => Array.isArray(arg) ? arg.includes('custom_charge_id') : arg === 'custom_charge_id',
    );
    expect(hasChargeId).toBe(true);
  });

  it('should handle invalid payload in successful_payment gracefully', async () => {
    const ctx = createSuccessfulPaymentCtx({
      invoice_payload: 'invalid-json',
    });

    // Should not throw even with bad payload
    await expect(handleSuccessfulPayment(ctx)).resolves.not.toThrow();
  });

  it('should propagate DB errors from transaction (Grammy error handler catches them)', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 100, user_id: 1, amount: '599', status: 'pending', metadata: { tier: 'premium' } });
    mockTransaction.mockRejectedValueOnce(new Error('DB write failed'));

    const ctx = createSuccessfulPaymentCtx();

    // The handler doesn't have internal try-catch around transaction —
    // Grammy's bot.catch() handles it at the framework level
    await expect(handleSuccessfulPayment(ctx)).rejects.toThrow('DB write failed');
  });
});
