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
    // query returns empty array (no pending quests)
    mockQuery.mockResolvedValueOnce([]);

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should send reminders to users with pending quests', async () => {
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
  });

  it('should log failed sends with user IDs', async () => {
    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 2 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = {
      api: { sendMessage: vi.fn().mockRejectedValue(new Error('User blocked bot')) },
    } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockLogWarn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send reminder to user 111'),
    );
    expect(mockLogWarn).toHaveBeenCalledWith(
      'Failed telegram IDs',
      expect.objectContaining({ failedUserIds: [111] }),
    );
  });

  it('should handle Telegram 429 rate limit and retry after waiting', async () => {
    vi.useFakeTimers();

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
    expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('Rate limited, waiting'));

    vi.useRealTimers();
  });

  it('should use default first_name when missing', async () => {
    const users = [
      { telegram_id: 111, first_name: null, pending_count: 2 },
    ];

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('there'));
  });

  it('should log structured counts on completion', async () => {
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

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 1, failed: 1, total: 2 }),
    );
  });
});
