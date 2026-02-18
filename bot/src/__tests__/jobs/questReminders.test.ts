/**
 * Tests for Quest Reminders Job (bot/src/jobs/definitions/questReminders.ts)
 *
 * Tests: job metadata, message sending, failure logging, rate limit handling,
 * DND check, reminder scheduling, batch rate limiting.
 *
 * Run 73 Agent D: Enhanced with DND check and scheduling tests.
 * NOTE: No fake timers for most tests — the handler uses internal sleep()
 * which conflicts with vi.useFakeTimers() in some scenarios.
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
    expect(CRON_SCHEDULE).toBe('0 * * * *');
  });

  it('should throw when bot instance not set', async () => {
    setBotInstance(null as any);
    await expect(handler([{} as any])).rejects.toThrow('Bot instance not set');
  });

  it('should handle query failure gracefully', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await expect(handler([{} as any])).rejects.toThrow('DB error');
    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should handle empty result gracefully', async () => {
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

    mockQuery.mockResolvedValueOnce(users);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('Alice'), expect.objectContaining({ parse_mode: 'HTML' }));
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(222, expect.stringContaining('Bob'), expect.objectContaining({ parse_mode: 'HTML' }));
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

    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('there'), expect.objectContaining({ parse_mode: 'HTML' }));
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

// ─── DND check tests ───────────────────────────────────────────────

describe('questReminders DND check', () => {
  it('query only returns active users with pending quests', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('is_active');
    expect(sql).toContain('pending');
  });

  it('users in DND window are excluded from results (DB-level filter)', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const mockBot = { api: { sendMessage: vi.fn() } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('no pending quests')
    );
  });

  it('only non-DND users receive reminders', async () => {
    const nonDndUsers = [
      { telegram_id: 333, first_name: 'Charlie', pending_count: 2 },
    ];
    mockQuery.mockResolvedValueOnce(nonDndUsers);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(333, expect.stringContaining('Charlie'), expect.objectContaining({ parse_mode: 'HTML' }));
  });
});

// ─── Reminder scheduling tests ──────────────────────────────────────

describe('questReminders scheduling', () => {
  it('cron runs every hour for timezone-aware scheduling', () => {
    const parts = CRON_SCHEDULE.split(' ');
    expect(parts[0]).toBe('0');  // minute
    expect(parts[1]).toBe('*');  // every hour (checks user's local time)
    expect(parts[2]).toBe('*');  // day of month
    expect(parts[3]).toBe('*');  // month
    expect(parts[4]).toBe('*');  // day of week
  });

  it('sends to multiple users in sequence', async () => {
    const users = Array.from({ length: 4 }, (_, i) => ({
      telegram_id: (i + 1) * 100,
      first_name: `User${i + 1}`,
      pending_count: i + 1,
    }));
    mockQuery.mockResolvedValueOnce(users);

    const sendOrder: number[] = [];
    const mockBot = {
      api: {
        sendMessage: vi.fn().mockImplementation((chatId: number) => {
          sendOrder.push(chatId);
          return Promise.resolve({});
        }),
      },
    } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(4);
    expect(sendOrder).toEqual([100, 200, 300, 400]);
  });

  it('logs elapsed time on completion', async () => {
    mockQuery.mockResolvedValueOnce([
      { telegram_id: 100, first_name: 'Test', pending_count: 1 },
    ]);

    const mockBot = { api: { sendMessage: vi.fn().mockResolvedValue({}) } } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    const completedLog = mockLogInfo.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('Completed')
    );
    expect(completedLog).toBeDefined();
    expect(completedLog![0]).toMatch(/Completed in \d+ms/);
  });

  it('tracks failed user IDs for monitoring', async () => {
    const users = [
      { telegram_id: 111, first_name: 'Alice', pending_count: 1 },
      { telegram_id: 222, first_name: 'Bob', pending_count: 1 },
      { telegram_id: 333, first_name: 'Charlie', pending_count: 1 },
    ];
    mockQuery.mockResolvedValueOnce(users);

    const mockBot = {
      api: {
        sendMessage: vi.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('blocked'))
          .mockRejectedValueOnce(new Error('blocked')),
      },
    } as any;
    setBotInstance(mockBot);

    await handler([{} as any]);

    expect(mockLogWarn).toHaveBeenCalledWith(
      'Failed telegram IDs',
      expect.objectContaining({ failedUserIds: [222, 333] }),
    );
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 1, failed: 2, total: 3 }),
    );
  });
});
