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

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();
const mockLogError = vi.fn();

vi.mock('../../api/utils/logger.js', () => ({
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

import { handler, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/analyticsExport.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('analyticsExport', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('analytics-export');
    expect(CRON_SCHEDULE).toBe('0 6 * * 1'); // Monday at 6 AM UTC
  });

  it('should call sheets_analytics_export with --export-all', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 100, sheets_updated: ['users', 'quests'] },
    });

    await handler([{} as any]);

    expect(mockExecutePythonTool).toHaveBeenCalledWith('sheets_analytics_export', ['--export-all']);
  });

  it('should log row and sheet counts on success', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 250, sheets_updated: ['users', 'quests', 'achievements'] },
    });

    await handler([{} as any]);

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ totalRows: 250, sheetsUpdated: 3 })
    );
  });

  it('should handle missing data fields gracefully', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {},
    });

    await handler([{} as any]);

    // Should default to 0 rows, 0 sheets
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ totalRows: 0, sheetsUpdated: 0 })
    );
  });

  it('should throw when export fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Google Sheets API quota exceeded',
    });

    await expect(handler([{} as any])).rejects.toThrow('Analytics export failed');
  });

  it('should log start and completion with timing', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_rows: 10, sheets_updated: ['users'] },
    });

    await handler([{} as any]);

    expect(mockLogInfo).toHaveBeenCalledWith('Started');
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.anything()
    );
  });
});
