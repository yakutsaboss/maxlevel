/**
 * Tests for paymentHelpers.ts (extracted from payments.ts by Agent A in Run 59)
 *
 * Tests: isValidTier, isPositiveInteger, verifyWebhookSecret
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockRequest } from '../setup.js';

// Mock logger to silence output
vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

import { isValidTier, isPositiveInteger, verifyWebhookSecret } from '../../utils/paymentHelpers.js';

// ─── isValidTier tests ──────────────────────────────────────────────

describe('isValidTier', () => {
  it('returns true for "free"', () => {
    expect(isValidTier('free')).toBe(true);
  });

  it('returns true for "subscriber"', () => {
    expect(isValidTier('subscriber')).toBe(true);
  });

  it('returns true for "premium"', () => {
    expect(isValidTier('premium')).toBe(true);
  });

  it('returns false for "pro" (old tier name)', () => {
    expect(isValidTier('pro')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidTier('')).toBe(false);
  });

  it('returns false for arbitrary string', () => {
    expect(isValidTier('gold')).toBe(false);
  });
});

// ─── isPositiveInteger tests ────────────────────────────────────────

describe('isPositiveInteger', () => {
  it('returns true for positive integer', () => {
    expect(isPositiveInteger(1)).toBe(true);
    expect(isPositiveInteger(42)).toBe(true);
    expect(isPositiveInteger(999999)).toBe(true);
  });

  it('returns false for zero', () => {
    expect(isPositiveInteger(0)).toBe(false);
  });

  it('returns false for negative integer', () => {
    expect(isPositiveInteger(-1)).toBe(false);
    expect(isPositiveInteger(-100)).toBe(false);
  });

  it('returns false for float', () => {
    expect(isPositiveInteger(1.5)).toBe(false);
    expect(isPositiveInteger(0.1)).toBe(false);
  });

  it('returns false for string', () => {
    expect(isPositiveInteger('1' as any)).toBe(false);
  });

  it('returns false for NaN', () => {
    expect(isPositiveInteger(NaN)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isPositiveInteger(null as any)).toBe(false);
    expect(isPositiveInteger(undefined as any)).toBe(false);
  });
});

// ─── verifyWebhookSecret tests ──────────────────────────────────────

describe('verifyWebhookSecret', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('throws when webhook secret is not configured', () => {
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
    delete process.env.TELEGRAM_BOT_TOKEN;

    const req = mockRequest({
      headers: { 'x-telegram-bot-api-secret-token': 'some-token' },
    });

    expect(() => verifyWebhookSecret(req)).toThrow('Webhook verification not configured');
  });

  it('throws when request is missing secret token header', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-bot-token';

    const req = mockRequest({
      headers: {},
    });

    expect(() => verifyWebhookSecret(req)).toThrow('Missing webhook secret token');
  });

  it('throws when secret token does not match', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'correct-secret';

    const req = mockRequest({
      headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret' },
    });

    expect(() => verifyWebhookSecret(req)).toThrow('Invalid webhook secret token');
  });

  it('does not throw when secret token matches BOT_TOKEN', () => {
    process.env.TELEGRAM_BOT_TOKEN = 'my-secret-token';

    const req = mockRequest({
      headers: { 'x-telegram-bot-api-secret-token': 'my-secret-token' },
    });

    expect(() => verifyWebhookSecret(req)).not.toThrow();
  });

  it('prefers TELEGRAM_WEBHOOK_SECRET over TELEGRAM_BOT_TOKEN', () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = 'webhook-secret';
    process.env.TELEGRAM_BOT_TOKEN = 'bot-token';

    const req = mockRequest({
      headers: { 'x-telegram-bot-api-secret-token': 'webhook-secret' },
    });

    expect(() => verifyWebhookSecret(req)).not.toThrow();

    // Using bot token should fail when webhook secret is set
    const req2 = mockRequest({
      headers: { 'x-telegram-bot-api-secret-token': 'bot-token' },
    });

    expect(() => verifyWebhookSecret(req2)).toThrow('Invalid webhook secret token');
  });
});
