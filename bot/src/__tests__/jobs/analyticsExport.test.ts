/**
 * Tests for Analytics Export Job (bot/src/jobs/definitions/analyticsExport.ts)
 *
 * Tests: job metadata, python tool invocation, structured logging, error handling
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

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockExecutePythonTool).toHaveBeenCalledWith('sheets_analytics_export', ['--export-all']);

    consoleSpy.mockRestore();
  });

  it('should log row and sheet counts on success', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 250, sheets_updated: ['users', 'quests', 'achievements'] },
    });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('250 rows exported to 3 sheets'));

    consoleSpy.mockRestore();
  });

  it('should handle missing data fields gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

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

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Analytics export failed');
    await expect(promise).rejects.toThrow('Google Sheets API quota exceeded');

    consoleSpy.mockRestore();
  });

  it('should log start and completion with timing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 10, sheets_updated: ['users'] },
    });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Started`));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`[JOB:${JOB_NAME}] Completed in`));

    consoleSpy.mockRestore();
  });
});
