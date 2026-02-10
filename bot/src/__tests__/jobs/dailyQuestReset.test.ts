/**
 * Tests for Daily Quest Reset Job (bot/src/jobs/definitions/dailyQuestReset.ts)
 *
 * Tests: pagination logic, retry with exponential backoff, failure tracking
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

vi.useFakeTimers();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/dailyQuestReset.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('dailyQuestReset', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('daily-quest-reset');
    expect(CRON_SCHEDULE).toBe('0 0 * * *');
  });

  it('should process a single batch of users', async () => {
    const users = [{ id: 1 }, { id: 2 }, { id: 3 }];

    // First query: list users (returns user array)
    mockQuery
      .mockResolvedValueOnce(users)
      // For each user: get active modes
      .mockResolvedValueOnce([{ mode_id: 1 }])
      // available daily templates
      .mockResolvedValueOnce([{ id: 10, difficulty: 'easy' }])
      // user 2: active modes
      .mockResolvedValueOnce([{ mode_id: 1 }])
      .mockResolvedValueOnce([{ id: 11, difficulty: 'medium' }])
      // user 3: active modes
      .mockResolvedValueOnce([{ mode_id: 1 }])
      .mockResolvedValueOnce([{ id: 12, difficulty: 'hard' }]);

    // execute for quest instance inserts + target updates
    mockExecute.mockResolvedValue(1);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should have called query for user listing
    expect(mockQuery).toHaveBeenCalled();
    const firstCallSql = mockQuery.mock.calls[0][0] as string;
    expect(firstCallSql).toContain('users');
    expect(firstCallSql).toContain('is_active');
  });

  it('should throw when first batch fails', async () => {
    // query throws DB error
    mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

    const promise = handler([{} as any]);
    const assertion = expect(promise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('should retry failed user assignments up to 3 times', async () => {
    const users = [{ id: 1 }];

    // list users
    mockQuery.mockResolvedValueOnce(users);
    // attempt 1: get active modes succeeds but templates query fails
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('timeout'));
    // attempt 2: same
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('timeout'));
    // attempt 3: same
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    // execute for target updates at end
    mockExecute.mockResolvedValue(0);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should have attempted multiple times
    expect(mockQuery.mock.calls.length).toBeGreaterThanOrEqual(4);
  });

  it('should track failed user IDs', async () => {
    const users = [{ id: 1 }, { id: 2 }];
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // list users
    mockQuery.mockResolvedValueOnce(users);
    // user 1: success
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockResolvedValueOnce([{ id: 10, difficulty: 'easy' }]);
    mockExecute.mockResolvedValueOnce(1);
    // user 2: fail all 3 retries
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('error'));
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('error'));
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockRejectedValueOnce(new Error('error'));

    // execute for target updates
    mockExecute.mockResolvedValue(0);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed user IDs')
    );

    consoleSpy.mockRestore();
  });
});
