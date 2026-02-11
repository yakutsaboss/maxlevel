/**
 * Tests for Achievement Batch Check Job (bot/src/jobs/definitions/achievementBatchCheck.ts)
 *
 * Tests: job metadata, user identification, achievement awarding, skip already-awarded,
 *        empty user list, error handling
 * Mocks: db.query, achievementEngine, logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  getPool: vi.fn(),
}));

const mockCheckAndUnlock = vi.fn();

vi.mock('../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: (...args: any[]) => mockCheckAndUnlock(...args),
}));

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: (...args: any[]) => mockLogInfo(...args),
      warn: (...args: any[]) => mockLogWarn(...args),
      error: (...args: any[]) => mockLogError(...args),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/achievementBatchCheck.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('achievementBatchCheck', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('achievement-batch-check');
    expect(CRON_SCHEDULE).toBe('0 */6 * * *');
  });

  it('should identify active users and check achievements for each', async () => {
    const users = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockQuery.mockResolvedValueOnce(users);
    mockCheckAndUnlock.mockResolvedValue([]);

    await handler([{} as any]);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('users');
    expect(sql).toContain('user_modes');
    expect(sql).toContain('is_active');
    expect(mockCheckAndUnlock).toHaveBeenCalledTimes(3);
    expect(mockCheckAndUnlock).toHaveBeenCalledWith(1);
    expect(mockCheckAndUnlock).toHaveBeenCalledWith(2);
    expect(mockCheckAndUnlock).toHaveBeenCalledWith(3);
  });

  it('should count unlocked achievements from fulfilled results', async () => {
    const users = [{ id: 10 }, { id: 20 }];
    mockQuery.mockResolvedValueOnce(users);
    // User 10 gets 2 achievements unlocked, user 20 gets 0
    mockCheckAndUnlock
      .mockResolvedValueOnce([{ id: 'ach-1' }, { id: 'ach-2' }])
      .mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.objectContaining({ totalChecked: 2, totalUnlocked: 2 }),
    );
  });

  it('should handle empty user list gracefully', async () => {
    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(mockCheckAndUnlock).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.objectContaining({ totalChecked: 0, totalUnlocked: 0 }),
    );
  });

  it('should continue processing when individual user checks fail', async () => {
    const users = [{ id: 1 }, { id: 2 }, { id: 3 }];
    mockQuery.mockResolvedValueOnce(users);
    mockCheckAndUnlock
      .mockResolvedValueOnce([{ id: 'ach-1' }])
      .mockRejectedValueOnce(new Error('DB timeout for user 2'))
      .mockResolvedValueOnce([]);

    // Should NOT throw — uses Promise.allSettled
    await handler([{} as any]);

    expect(mockCheckAndUnlock).toHaveBeenCalledTimes(3);
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.objectContaining({ totalChecked: 3, totalUnlocked: 1 }),
    );
  });

  it('should throw when the initial user query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection refused'));

    await expect(handler([{} as any])).rejects.toThrow('connection refused');
  });
});
