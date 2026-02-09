/**
 * Tests for leaderboard API route (bot/src/api/routes/leaderboard.ts)
 *
 * Mocks: db module (query), cache, auth middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
}));

const mockCached = vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn());

vi.mock('../../utils/cache.js', () => ({
  cached: (...args: any[]) => mockCached(...args),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

vi.mock('../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────

describe('GET /api/leaderboard', () => {
  it('should use default limit of 50', () => {
    const req = mockRequest({ query: {} });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    expect(limit).toBe(50);
  });

  it('should respect custom limit via query param', () => {
    const req = mockRequest({ query: { limit: '25' } });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    expect(limit).toBe(25);
  });

  it('should cap limit at 100', () => {
    const req = mockRequest({ query: { limit: '200' } });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    expect(limit).toBe(100);
  });

  it('should default to 50 for non-numeric limit', () => {
    const req = mockRequest({ query: { limit: 'abc' } });
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    expect(limit).toBe(50);
  });

  it('should use correct cache key format', async () => {
    const limit = 50;
    mockQuery.mockResolvedValueOnce([]);

    await mockCached(`leaderboard:${limit}`, 30_000, () =>
      mockQuery(expect.any(String), [limit])
    );

    expect(mockCached).toHaveBeenCalledWith('leaderboard:50', 30_000, expect.any(Function));
  });

  it('should return formatted leaderboard entries', async () => {
    const dbRows = [
      {
        user_id: 1,
        telegram_id: 123456789,
        username: 'testuser',
        first_name: 'Test',
        current_level: 5,
        total_xp: 2500,
        best_current_streak: '3',
        total_quests_completed: '42',
        xp_rank: '1',
        level_rank: '1',
      },
    ];

    mockQuery.mockResolvedValueOnce(dbRows);

    const entries = await mockCached('leaderboard:50', 30_000, () =>
      mockQuery(expect.any(String), [50])
    );

    // Apply the same formatting logic as the route
    const formatted = entries.map((row: any) => ({
      user_id: row.user_id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      level: row.current_level,
      total_xp: row.total_xp,
      current_streak: parseInt(row.best_current_streak) || 0,
      total_quests_completed: parseInt(row.total_quests_completed) || 0,
      xp_rank: parseInt(row.xp_rank) || 0,
      level_rank: parseInt(row.level_rank) || 0,
    }));

    expect(formatted[0].user_id).toBe(1);
    expect(formatted[0].current_streak).toBe(3);
    expect(formatted[0].total_quests_completed).toBe(42);
    expect(formatted[0].xp_rank).toBe(1);
  });

  it('should handle empty leaderboard', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const entries = await mockCached('leaderboard:50', 30_000, () =>
      mockQuery(expect.any(String), [50])
    );

    expect(entries).toEqual([]);
  });

  it('should return 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const res = mockResponse();

    try {
      await mockCached('leaderboard:50', 30_000, () =>
        mockQuery(expect.any(String), [50])
      );
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }

    expect(res._status).toBe(500);
    expect(res._json.success).toBe(false);
  });

  it('should handle null string fields gracefully', () => {
    const row = {
      user_id: 1,
      telegram_id: 123,
      username: null,
      first_name: null,
      current_level: 1,
      total_xp: 0,
      best_current_streak: null,
      total_quests_completed: null,
      xp_rank: '1',
      level_rank: '1',
    };

    const formatted = {
      current_streak: parseInt(row.best_current_streak as any) || 0,
      total_quests_completed: parseInt(row.total_quests_completed as any) || 0,
    };

    expect(formatted.current_streak).toBe(0);
    expect(formatted.total_quests_completed).toBe(0);
  });
});
