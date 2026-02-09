/**
 * Tests for Leaderboard Refresh Job (bot/src/jobs/definitions/leaderboardRefresh.ts)
 *
 * Tests: job metadata, cache pre-warming with direct query, error handling
 * Mocks: db.query, cache module
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('../../utils/cache.js', () => ({
  cached: vi.fn(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
  invalidatePrefix: vi.fn(),
  invalidate: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/leaderboardRefresh.js';
import { invalidatePrefix } from '../../utils/cache.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('leaderboardRefresh', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('leaderboard-refresh');
    expect(CRON_SCHEDULE).toBe('*/30 * * * *');
  });

  it('should call query to pre-warm leaderboard cache', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const leaderboardData = [
      { user_id: 1, username: 'alice', total_xp: 5000, xp_rank: 1 },
      { user_id: 2, username: 'bob', total_xp: 3000, xp_rank: 2 },
    ];
    mockQuery.mockResolvedValueOnce(leaderboardData);

    await handler([{} as any]);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('SELECT');
    expect(sql).toContain('users');
    expect(sql).toContain('total_xp');

    consoleSpy.mockRestore();
  });

  it('should invalidate stale leaderboard cache before refresh', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(invalidatePrefix).toHaveBeenCalledWith('leaderboard:');

    consoleSpy.mockRestore();
  });

  it('should log start and completion with timing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Started`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Completed in`));

    consoleSpy.mockRestore();
  });

  it('should throw when query fails', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockQuery.mockRejectedValueOnce(new Error('connection timeout after 30s'));

    await expect(handler([{} as any])).rejects.toThrow('connection timeout after 30s');

    consoleSpy.mockRestore();
  });
});
