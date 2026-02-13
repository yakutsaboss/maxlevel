/**
 * HTTP integration tests for mode gating (tier-based mode limits).
 *
 * Tests that POST /users/:userId/modes enforces mode limits per tier:
 *   free=2, subscriber=3, premium=6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted) ────────────────────────────────────────────────

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

// Mock premiumGate for getUserEffectiveTier + MODE_LIMITS
const mockGetUserEffectiveTier = vi.fn();
vi.mock('../../../api/middleware/premiumGate.js', () => ({
  getUserEffectiveTier: (...args: unknown[]) => mockGetUserEffectiveTier(...args),
  MODE_LIMITS: { free: 2, subscriber: 3, premium: 6 },
  requirePremium: () => (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ──────────────────────────────────────

import { modeRouter } from '../../../api/routes/modes.js';

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/modes', modeRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── POST /api/modes/users/:userId — mode gating ───────────────────

describe('POST /api/modes/users/:userId — tier mode gating', () => {
  it('should allow adding mode when under limit (free, 0/2)', async () => {
    // getUserEffectiveTier returns free
    mockGetUserEffectiveTier.mockResolvedValueOnce('free');
    // Current active mode count = 0
    db.queryOne.mockResolvedValueOnce({ count: 0 });
    // Mode lookup
    db.query.mockResolvedValueOnce([{ id: 1, name: 'fitness' }]);
    // No existing user_modes
    db.query.mockResolvedValueOnce([]);
    // Insert new user_mode
    db.query.mockResolvedValueOnce([{ id: 10, mode_id: 1 }]);
    // Streak upsert
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['fitness'] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.added).toHaveLength(1);
    expect(res.body.data.added[0].mode).toBe('fitness');
  });

  it('should block adding mode when at limit (free, 2/2)', async () => {
    // getUserEffectiveTier returns free
    mockGetUserEffectiveTier.mockResolvedValueOnce('free');
    // Current active mode count = 2 (at limit)
    db.queryOne.mockResolvedValueOnce({ count: 2 });

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['hydration'] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('limit');
  });

  it('should block adding when total would exceed limit (free, 1/2, adding 2)', async () => {
    // getUserEffectiveTier returns free
    mockGetUserEffectiveTier.mockResolvedValueOnce('free');
    // Current active mode count = 1
    db.queryOne.mockResolvedValueOnce({ count: 1 });

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['hydration', 'finance'] })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('limit');
  });

  it('should allow subscriber to have 3 modes', async () => {
    // getUserEffectiveTier returns subscriber
    mockGetUserEffectiveTier.mockResolvedValueOnce('subscriber');
    // Current active mode count = 2
    db.queryOne.mockResolvedValueOnce({ count: 2 });
    // Mode lookup
    db.query.mockResolvedValueOnce([{ id: 3, name: 'reading' }]);
    // No existing user_modes
    db.query.mockResolvedValueOnce([]);
    // Insert
    db.query.mockResolvedValueOnce([{ id: 30, mode_id: 3 }]);
    // Streak upsert
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['reading'] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.added).toHaveLength(1);
  });

  it('should allow premium to have up to 6 modes', async () => {
    // getUserEffectiveTier returns premium
    mockGetUserEffectiveTier.mockResolvedValueOnce('premium');
    // Current active mode count = 5
    db.queryOne.mockResolvedValueOnce({ count: 5 });
    // Mode lookup
    db.query.mockResolvedValueOnce([{ id: 4, name: 'finance' }]);
    // No existing user_modes
    db.query.mockResolvedValueOnce([]);
    // Insert
    db.query.mockResolvedValueOnce([{ id: 40, mode_id: 4 }]);
    // Streak upsert
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['finance'] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.added).toHaveLength(1);
  });

  it('should return tier info in error when limit exceeded', async () => {
    // getUserEffectiveTier returns free
    mockGetUserEffectiveTier.mockResolvedValueOnce('free');
    // Current active mode count = 2 (at limit)
    db.queryOne.mockResolvedValueOnce({ count: 2 });

    const res = await request(buildApp())
      .post('/api/modes/users/1')
      .send({ modes: ['reading'] })
      .expect(400);

    expect(res.body.success).toBe(false);
    // Should include tier and limit info
    const errorText = res.body.error.toLowerCase();
    expect(errorText).toMatch(/free|limit|2|tier/);
  });
});
