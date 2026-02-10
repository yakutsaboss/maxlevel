/**
 * Tests for Quest Reminders Job (bot/src/jobs/definitions/questReminders.ts)
 *
 * Tests: job metadata, message sending, failure logging, rate limit handling
 * NOTE: No fake timers — the handler uses internal sleep() which conflicts with vi.useFakeTimers()
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  execute: vi.fn(),
  getPool: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
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
    await expect(handler([{} as any])).rejects.toThrow('Bot instance not set');
  });

  it('should handle query failure gracefully', async () => {
    // query throws (DB error) — error propagates (no try/catch in handler)
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await expect(handler([{} as any])).rejects.toThrow('DB error');
    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle empty result gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // query returns empty array (no pending quests)
    mockQuery.mockResolvedValueOnce([]);

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should send reminders to users with pending quests', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 3 },
      { telegram_id: 222, first_name: 'Bob', pending_count: 1 },
    ];

    // query returns users with pending quests directly
    mockQuery.mockResolvedValueOnce(users);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('Alice'));
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(222, expect.stringContaining('1 quest'));

    consoleSpy.mockRestore();
  });

  it('should log failed sends with user IDs', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 2 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = {
      api: { sendMessage: vi.fn().mockRejectedValue(new Error('User blocked bot')) },
    } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed to send reminder to user 111'));
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Failed telegram IDs: 111'));

    consoleSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('should handle Telegram 429 rate limit and retry after waiting', async () => {
    vi.useFakeTimers();

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 1 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    // Note: retry_after=0 is falsy so handler's `|| 5` defaults to 5.
    // Use fake timers to avoid the real 5s delay.
    const rateLimitError = Object.assign(new Error('Rate limited'), {
      error_code: 429,
      parameters: { retry_after: 0 },
    });

    const mockBot = {
      api: {
        sendMessage: vi.fn()
          .mockRejectedValueOnce(rateLimitError)
          .mockResolvedValueOnce({}),
      },
    } as any;
    setBotInstance(mockBot);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should have called sendMessage twice (initial + retry)
    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Rate limited, waiting'));

    consoleSpy.mockRestore();
    logSpy.mockRestore();
    vi.useRealTimers();
  });

  it('should use default first_name when missing', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: null, pending_count: 2 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('there'));

    logSpy.mockRestore();
  });

  it('should log structured counts on completion', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 2 },
      { telegram_id: 222, first_name: 'Bob', pending_count: 1 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = {
      api: {
        sendMessage: vi.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('blocked')),
      },
    } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('sent: 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('failed: 1'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('total: 2'));

    logSpy.mockRestore();
  });
});
