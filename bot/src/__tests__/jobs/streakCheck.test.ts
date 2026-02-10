/**
 * Tests for Streak Check Job (bot/src/jobs/definitions/streakCheck.ts)
 *
 * Tests: success flow, failure handling, broken streak logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/streakCheck.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('streakCheck', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('streak-check');
    expect(CRON_SCHEDULE).toBe('0 1 * * *');
  });

  it('should complete successfully with streak data', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // query returns active streaks
    mockQuery.mockResolvedValueOnce([
      { id: 1, user_id: 1, mode_id: 1, current_streak: 5, longest_streak: 10, last_activity_date: yesterday, telegram_id: 111, first_name: 'Alice' },
      { id: 2, user_id: 2, mode_id: 1, current_streak: 3, longest_streak: 3, last_activity_date: '2020-01-01', telegram_id: 222, first_name: 'Bob' },
    ]);

    // execute for resetting broken streak (Bob's is stale)
    mockExecute.mockResolvedValue(1);

    await handler([{} as any]);

    // Should query for active streaks
    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('streaks');
    expect(sql).toContain('current_streak');

    consoleSpy.mockRestore();
  });

  it('should throw on query failure', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(handler([{} as any])).rejects.toThrow();
  });

  it('should log broken streak details when available', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Both streaks are stale (old last_activity_date) → both should break
    mockQuery.mockResolvedValueOnce([
      { id: 1, user_id: 5, mode_id: 1, current_streak: 3, longest_streak: 5, last_activity_date: '2020-01-01', telegram_id: 555, first_name: 'User5' },
      { id: 2, user_id: 8, mode_id: 2, current_streak: 7, longest_streak: 7, last_activity_date: '2020-01-01', telegram_id: 888, first_name: 'User8' },
    ]);

    mockExecute.mockResolvedValue(1);

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Broken streak details')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('user_id=5')
    );

    consoleSpy.mockRestore();
  });

  it('should handle no active streaks gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // query returns empty array — no active streaks
    mockQuery.mockResolvedValueOnce([]);

    await expect(handler([{} as any])).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('broken: 0, maintained: 0')
    );

    consoleSpy.mockRestore();
  });

  it('should maintain streaks with recent activity', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // All streaks have yesterday's activity → should be maintained
    mockQuery.mockResolvedValueOnce([
      { id: 1, user_id: 1, mode_id: 1, current_streak: 10, longest_streak: 10, last_activity_date: yesterday, telegram_id: 111, first_name: 'Alice' },
      { id: 2, user_id: 2, mode_id: 2, current_streak: 5, longest_streak: 5, last_activity_date: yesterday, telegram_id: 222, first_name: 'Bob' },
    ]);

    await handler([{} as any]);

    // execute should NOT have been called (no broken streaks)
    expect(mockExecute).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
