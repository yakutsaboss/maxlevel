/**
 * Tests for updated premiumGate middleware with tier hierarchy (free/subscriber/premium).
 *
 * Tests getUserEffectiveTier(), MODE_LIMITS, and requirePremium with the new tier system.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../setup.js';

// ─── Mock db ────────────────────────────────────────────────────────

const mockQueryOne = vi.fn();

vi.mock('../../utils/db.js', () => ({
  queryOne: (...args: unknown[]) => mockQueryOne(...args),
  query: vi.fn(),
  execute: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('../../utils/validation.js', () => ({
  safeParseInt: (val: string, def: number) => {
    const n = parseInt(val, 10);
    return isNaN(n) ? def : n;
  },
}));

// ─── Import after mocks ─────────────────────────────────────────────

import {
  requirePremium,
  getUserEffectiveTier,
  MODE_LIMITS,
} from '../../api/middleware/premiumGate.js';

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── MODE_LIMITS constant ───────────────────────────────────────────

describe('MODE_LIMITS', () => {
  it('should define correct mode limits per tier', () => {
    expect(MODE_LIMITS).toEqual({
      free: 2,
      subscriber: 3,
      premium: 6,
    });
  });
});

// ─── getUserEffectiveTier ───────────────────────────────────────────

describe('getUserEffectiveTier', () => {
  it('should return free when no subscription exists', async () => {
    // No subscription row
    mockQueryOne.mockResolvedValueOnce(null);
    // No channel cache
    mockQueryOne.mockResolvedValueOnce(null);

    const tier = await getUserEffectiveTier(1);
    expect(tier).toBe('free');
  });

  it('should return subscriber when channel cache shows subscribed', async () => {
    // Subscription row is free
    mockQueryOne.mockResolvedValueOnce({ tier: 'free', expires_at: null });
    // Channel cache shows subscribed
    mockQueryOne.mockResolvedValueOnce({ is_subscribed: true });

    const tier = await getUserEffectiveTier(1);
    expect(tier).toBe('subscriber');
  });

  it('should return premium when subscription is premium', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    // Subscription row is premium (active)
    mockQueryOne.mockResolvedValueOnce({ tier: 'premium', expires_at: futureDate });
    // Channel cache (irrelevant — premium is higher)
    mockQueryOne.mockResolvedValueOnce({ is_subscribed: true });

    const tier = await getUserEffectiveTier(1);
    expect(tier).toBe('premium');
  });

  it('should return free when premium subscription has expired', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    // Expired premium subscription
    mockQueryOne.mockResolvedValueOnce({ tier: 'premium', expires_at: pastDate });
    // No channel subscription
    mockQueryOne.mockResolvedValueOnce(null);

    const tier = await getUserEffectiveTier(1);
    expect(tier).toBe('free');
  });

  it('should return subscriber when premium expired but channel is active', async () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    // Expired premium subscription
    mockQueryOne.mockResolvedValueOnce({ tier: 'premium', expires_at: pastDate });
    // Channel subscription is active
    mockQueryOne.mockResolvedValueOnce({ is_subscribed: true });

    const tier = await getUserEffectiveTier(1);
    expect(tier).toBe('subscriber');
  });
});

// ─── requirePremium middleware ───────────────────────────────────────

describe('requirePremium', () => {
  it('should allow access when user tier meets requirement', async () => {
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    // Subscription: premium
    mockQueryOne.mockResolvedValueOnce({ tier: 'premium', expires_at: futureDate });
    // Channel cache
    mockQueryOne.mockResolvedValueOnce(null);

    const middleware = requirePremium('subscriber');
    const req = mockRequest({ params: { userId: '1' } });
    const res = mockResponse();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next.called).toBe(true);
    expect(res._status).toBe(200); // default, not changed
  });

  it('should deny access when user tier is below requirement', async () => {
    // Subscription: free
    mockQueryOne.mockResolvedValueOnce({ tier: 'free', expires_at: null });
    // No channel subscription
    mockQueryOne.mockResolvedValueOnce(null);

    const middleware = requirePremium('premium');
    const req = mockRequest({ params: { userId: '1' } });
    const res = mockResponse();
    const next = mockNext();

    await middleware(req, res, next);

    expect(next.called).toBe(false);
    expect(res._status).toBe(403);
    expect(res._json.success).toBe(false);
    expect(res._json.message).toContain('premium');
  });
});
