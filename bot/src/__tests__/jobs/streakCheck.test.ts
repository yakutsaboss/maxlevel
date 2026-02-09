/**
 * Tests for Streak Check Job (bot/src/jobs/definitions/streakCheck.ts)
 *
 * Tests: success flow, failure handling, broken streak logging
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockExecutePythonTool = vi.fn();

vi.mock('../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
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
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { broken: 5, maintained: 95 },
    });

    await handler([{} as any]);

    expect(mockExecutePythonTool).toHaveBeenCalledWith('streak_manager', ['--check-all-streaks']);
  });

  it('should throw on failure', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Connection refused',
    });

    await expect(handler([{} as any])).rejects.toThrow('Streak check failed');
  });

  it('should log broken streak details when available', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {
        broken: 2,
        maintained: 10,
        broken_details: [
          { user_id: 5, mode_id: 1, current_streak: 3 },
          { user_id: 8, mode_id: 2, previous_streak: 7 },
        ],
      },
    });

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Broken streak details')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('user_id=5')
    );

    consoleSpy.mockRestore();
  });

  it('should handle missing broken_details gracefully', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { broken: 0, maintained: 50 },
    });

    await expect(handler([{} as any])).resolves.toBeUndefined();
  });

  it('should handle null data fields with defaults', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('broken: 0, maintained: 0')
    );

    consoleSpy.mockRestore();
  });
});
