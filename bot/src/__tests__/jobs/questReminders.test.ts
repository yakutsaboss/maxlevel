/**
 * Tests for Quest Reminders Job (bot/src/jobs/definitions/questReminders.ts)
 *
 * Tests: job metadata, message batching, Telegram 429 rate limit handling, failure logging
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

import { handler, JOB_NAME, CRON_SCHEDULE, setBotInstance } from '../../jobs/definitions/questReminders.js';

// ─── Tests ───────────────────────────────────────────────────────────

describe('questReminders', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('quest-reminders');
    expect(CRON_SCHEDULE).toBe('0 18 * * *');
  });

  it('should throw when bot instance not set', async () => {
    setBotInstance(null as any);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow('Bot instance not set');
  });

  it('should handle query failure gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({ success: false, data: null });

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should not try to send any messages
    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    // Should log completion
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Completed'));

    consoleSpy.mockRestore();
  });

  it('should handle non-array data gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: 'not-array' });

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should send reminders to users with pending quests', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 3 },
      { telegram_id: 222, first_name: 'Bob', pending_count: 1 },
    ];

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: users });

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
      111,
      expect.stringContaining('Alice')
    );
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
      222,
      expect.stringContaining('1 quest')
    );

    consoleSpy.mockRestore();
  });

  it('should log failed sends with user IDs', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 2 },
    ];

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: users });

    const mockBot = {
      api: {
        sendMessage: vi.fn().mockRejectedValue(new Error('User blocked bot')),
      },
    } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send reminder to user 111')
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed telegram IDs: 111')
    );

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should handle Telegram 429 rate limit and retry', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 1 },
    ];

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: users });

    const rateLimitError = Object.assign(new Error('Rate limited'), {
      error_code: 429,
      parameters: { retry_after: 2 },
    });

    const mockBot = {
      api: {
        sendMessage: vi.fn()
          .mockRejectedValueOnce(rateLimitError)  // first attempt: 429
          .mockResolvedValueOnce({}),               // retry: success
      },
    } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should have called sendMessage twice (initial + retry)
    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Rate limited, waiting 2s')
    );

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should use default first_name when missing', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: null, pending_count: 2 },
    ];

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: users });

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(
      111,
      expect.stringContaining('there')
    );

    logSpy.mockRestore();
  });
});
