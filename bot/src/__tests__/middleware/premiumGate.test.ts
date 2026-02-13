/**
 * Tests for Premium Gate middleware (bot/src/api/middleware/premiumGate.ts)
 *
 * Tests:
 * - Allows access for premium users
 * - Blocks access for free users when subscriber required
 * - Blocks access for subscriber users when premium required
 * - Returns 400 when userId is missing
 * - Returns 400 when userId is NaN
 * - Treats expired subscription as free
 * - Allows expired subscription when minTier is free
 * - Falls back to free when no subscription found
 * - Passes DB errors to next()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockNext } from '../setup.js';

// ─── Mock db module ─────────────────────────────────────────────────

const mockQueryOne = vi.fn();

vi.mock('../../utils/db.js', () => ({
  queryOne: (...args: any[]) => mockQueryOne(...args),
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

// ─── Import AFTER mocks ─────────────────────────────────────────────

import { requirePremium } from '../../api/middleware/premiumGate.js';

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('requirePremium middleware', () => {
  describe('userId extraction', () => {
    it('should return 400 when userId is missing', async () => {
      const middleware = requirePremium('subscriber');
      const req = mockRequest({ params: {}, body: {} });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(res._json.message).toContain('userId is required');
      expect(next.called).toBe(false);
    });

    it('should return 400 when userId is NaN', async () => {
      const middleware = requirePremium('subscriber');
      const req = mockRequest({ params: { userId: 'abc' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(400);
      expect(res._json.success).toBe(false);
      expect(next.called).toBe(false);
    });

    it('should extract userId from req.params', async () => {
      const middleware = requirePremium('free');
      mockQueryOne.mockResolvedValue(null);
      const req = mockRequest({ params: { userId: '42' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [42],
      );
      expect(next.called).toBe(true);
    });

    it('should extract userId from req.body when params missing', async () => {
      const middleware = requirePremium('free');
      mockQueryOne.mockResolvedValue(null);
      const req = mockRequest({ params: {}, body: { userId: '99' } });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(mockQueryOne).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [99],
      );
      expect(next.called).toBe(true);
    });
  });

  describe('tier access control', () => {
    it('should allow premium user for pro-required endpoint', async () => {
      const middleware = requirePremium('subscriber');
      mockQueryOne.mockResolvedValue({ tier: 'premium', expires_at: null });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      expect(res._status).toBe(200);
    });

    it('should allow subscriber user for subscriber-required endpoint', async () => {
      const middleware = requirePremium('subscriber');
      // 1st query: subscriptions → no premium sub
      mockQueryOne.mockResolvedValueOnce(null);
      // 2nd query: channel_subscriptions → subscribed
      mockQueryOne.mockResolvedValueOnce({ is_subscribed: true, checked_at: new Date().toISOString() });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
    });

    it('should block free user for subscriber-required endpoint', async () => {
      const middleware = requirePremium('subscriber');
      mockQueryOne.mockResolvedValue({ tier: 'free', expires_at: null });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(403);
      expect(res._json.success).toBe(false);
      expect(res._json.message).toContain('subscriber');
      expect(res._json.message).toContain('free');
      expect(next.called).toBe(false);
    });

    it('should block subscriber user for premium-required endpoint', async () => {
      const middleware = requirePremium('premium');
      // 1st query: subscriptions → no premium sub
      mockQueryOne.mockResolvedValueOnce(null);
      // 2nd query: channel_subscriptions → subscribed (subscriber tier)
      mockQueryOne.mockResolvedValueOnce({ is_subscribed: true, checked_at: new Date().toISOString() });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(403);
      expect(res._json.message).toContain('premium');
      expect(res._json.message).toContain('subscriber');
      expect(next.called).toBe(false);
    });

    it('should treat no subscription as free tier', async () => {
      const middleware = requirePremium('subscriber');
      mockQueryOne.mockResolvedValue(null);
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(403);
      expect(next.called).toBe(false);
    });

    it('should allow free user for free-required endpoint', async () => {
      const middleware = requirePremium('free');
      mockQueryOne.mockResolvedValue({ tier: 'free', expires_at: null });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
    });
  });

  describe('subscription expiry', () => {
    it('should treat expired subscription as free and block for subscriber', async () => {
      const middleware = requirePremium('subscriber');
      const pastDate = new Date(Date.now() - 86400_000).toISOString(); // 1 day ago
      mockQueryOne.mockResolvedValue({ tier: 'premium', expires_at: pastDate });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(403);
      expect(res._json.message).toContain('subscriber');
      expect(res._json.message).toContain('free');
      expect(next.called).toBe(false);
    });

    it('should allow expired subscription when minTier is free', async () => {
      const middleware = requirePremium('free');
      const pastDate = new Date(Date.now() - 86400_000).toISOString();
      mockQueryOne.mockResolvedValue({ tier: 'subscriber', expires_at: pastDate });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
    });

    it('should allow non-expired premium subscription', async () => {
      const middleware = requirePremium('premium');
      const futureDate = new Date(Date.now() + 86400_000).toISOString(); // 1 day from now
      mockQueryOne.mockResolvedValue({ tier: 'premium', expires_at: futureDate });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should pass DB errors to next()', async () => {
      const middleware = requirePremium('subscriber');
      const dbError = new Error('DB connection failed');
      mockQueryOne.mockRejectedValue(dbError);
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
      expect(next.error).toBe(dbError);
    });
  });

  describe('unknown tier handling', () => {
    it('should treat unknown minTier as free (level 0)', async () => {
      const middleware = requirePremium('nonexistent');
      mockQueryOne.mockResolvedValue({ tier: 'free', expires_at: null });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(next.called).toBe(true);
    });

    it('should treat unknown user tier as free', async () => {
      const middleware = requirePremium('subscriber');
      mockQueryOne.mockResolvedValue({ tier: 'unknown_tier', expires_at: null });
      const req = mockRequest({ params: { userId: '1' } as any });
      const res = mockResponse();
      const next = mockNext();

      await middleware(req, res, next);

      expect(res._status).toBe(403);
      expect(next.called).toBe(false);
    });
  });
});
