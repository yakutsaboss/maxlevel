/**
 * Tests for Daily Quest Reset Job (bot/src/jobs/definitions/dailyQuestReset.ts)
 *
 * Tests: pagination logic, retry with exponential backoff, failure tracking
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockExecutePythonTool = vi.fn();

vi.mock('../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
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

    mockExecutePythonTool
      .mockResolvedValueOnce({ success: true, data: users })
      .mockResolvedValueOnce({ success: true, data: {} })
      .mockResolvedValueOnce({ success: true, data: {} })
      .mockResolvedValueOnce({ success: true, data: {} });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockExecutePythonTool).toHaveBeenCalledTimes(4);
    expect(mockExecutePythonTool).toHaveBeenCalledWith('user_manager', expect.arrayContaining(['--list-users']));
    expect(mockExecutePythonTool).toHaveBeenCalledWith('quest_manager', expect.arrayContaining(['--assign-daily']));
  });

  it('should throw when first batch fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Database connection failed',
    });

    const promise = handler([{} as any]);
    // Attach rejection handler BEFORE running timers to avoid unhandled rejection
    const assertion = expect(promise).rejects.toThrow('Failed to list users');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('should retry failed user assignments up to 3 times', async () => {
    const users = [{ id: 1 }];

    mockExecutePythonTool
      .mockResolvedValueOnce({ success: true, data: users })
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce({ success: false, error: 'timeout' })
      .mockResolvedValueOnce({ success: false, error: 'timeout' });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockExecutePythonTool).toHaveBeenCalledTimes(4);
  });

  it('should track failed user IDs', async () => {
    const users = [{ id: 1 }, { id: 2 }];
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockExecutePythonTool
      .mockResolvedValueOnce({ success: true, data: users })
      .mockResolvedValueOnce({ success: true, data: {} })
      .mockResolvedValueOnce({ success: false, error: 'error' })
      .mockResolvedValueOnce({ success: false, error: 'error' })
      .mockResolvedValueOnce({ success: false, error: 'error' });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed user IDs')
    );

    consoleSpy.mockRestore();
  });
});
