/**
 * Tests for Leaderboard Refresh Job (bot/src/jobs/definitions/leaderboardRefresh.ts)
 *
 * Tests: job metadata, materialized view refresh SQL, error handling
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

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/leaderboardRefresh.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('leaderboardRefresh', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('leaderboard-refresh');
    expect(CRON_SCHEDULE).toBe('*/30 * * * *');
  });

  it('should call executePythonTool with correct args for materialized view refresh', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({ success: true });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockExecutePythonTool).toHaveBeenCalledWith('db_operations', [
      '--execute',
      'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_mv',
    ]);

    consoleSpy.mockRestore();
  });

  it('should log start and completion with timing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({ success: true });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Started`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Completed in`));

    consoleSpy.mockRestore();
  });

  it('should throw when refresh fails', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'materialized view does not exist',
    });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Leaderboard refresh failed');

    consoleSpy.mockRestore();
  });

  it('should throw with error details from python tool', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'connection timeout after 30s',
    });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('connection timeout after 30s');

    consoleSpy.mockRestore();
  });
});
