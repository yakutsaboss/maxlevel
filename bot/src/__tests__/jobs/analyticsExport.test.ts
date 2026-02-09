/**
 * Tests for Analytics Export Job (bot/src/jobs/definitions/analyticsExport.ts)
 *
 * Tests: job metadata, python tool invocation, structured logging, error handling
 * NOTE: No fake timers — the handler uses internal sleep() which conflicts with vi.useFakeTimers()
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

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/analyticsExport.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('analyticsExport', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('analytics-export');
    expect(CRON_SCHEDULE).toBe('0 6 * * 1'); // Monday at 6 AM UTC
  });

  it('should call sheets_analytics_export with --export-all', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 100, sheets_updated: ['users', 'quests'] },
    });

    await handler([{} as any]);

    expect(mockExecutePythonTool).toHaveBeenCalledWith('sheets_analytics_export', ['--export-all']);

    consoleSpy.mockRestore();
  });

  it('should log row and sheet counts on success', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 250, sheets_updated: ['users', 'quests', 'achievements'] },
    });

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('250 rows exported to 3 sheets'));

    consoleSpy.mockRestore();
  });

  it('should handle missing data fields gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    await handler([{} as any]);

    // Should default to 0 rows, 0 sheets
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('0 rows exported to 0 sheets'));

    consoleSpy.mockRestore();
  });

  it('should throw when export fails', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Google Sheets API quota exceeded',
    });

    await expect(handler([{} as any])).rejects.toThrow('Analytics export failed');

    consoleSpy.mockRestore();
  });

  it('should log start and completion with timing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 10, sheets_updated: ['users'] },
    });

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Started`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Completed in`));

    consoleSpy.mockRestore();
  });
});
