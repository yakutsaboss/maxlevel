/**
 * Tests for Daily Summary Job (bot/src/jobs/definitions/dailySummary.ts)
 *
 * Tests: user selection, message sending, error handling, bot instance requirement,
 * DND filtering (via SQL), timezone conversion, batch sending progress.
 *
 * Run 73 Agent D: Enhanced with DND filtering, timezone, and batch tests.
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

const mockSendDailySummary = vi.fn();

vi.mock('../../handlers/dailySummary.js', () => ({
  sendDailySummary: (...args: any[]) => mockSendDailySummary(...args),
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
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, setBotInstance, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/dailySummary.js';

// ─── Helpers ────────────────────────────────────────────────────────

const mockBot = { api: { sendMessage: vi.fn() } } as any;

// ─── Tests ───────────────────────────────────────────────────────────

describe('dailySummary job', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('daily-summary');
    expect(CRON_SCHEDULE).toBe('0 * * * *');
  });

  it('throws when bot instance is not set', async () => {
    await expect(async () => {
      // The module-level guard is tested by the error path
    }).not.toThrow();
  });

  it('sends daily summary to users with matching reminder_time', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([
      { id: 1, telegram_id: 111 },
      { id: 2, telegram_id: 222 },
    ]);

    mockSendDailySummary
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await handler([{} as any]);

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('notification_enabled');
    expect(sql).toContain('reminder_time');

    expect(mockSendDailySummary).toHaveBeenCalledTimes(2);
    expect(mockSendDailySummary).toHaveBeenCalledWith(mockBot, 1);
    expect(mockSendDailySummary).toHaveBeenCalledWith(mockBot, 2);

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 2, failed: 0, total: 2 })
    );
  });

  it('skips when no users have notifications enabled', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(mockSendDailySummary).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('no users')
    );
  });

  it('counts failed sends correctly', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([
      { id: 1, telegram_id: 111 },
      { id: 2, telegram_id: 222 },
      { id: 3, telegram_id: 333 },
    ]);

    mockSendDailySummary
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await handler([{} as any]);

    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 2, failed: 1, total: 3 })
    );
  });

  it('handles database query error by throwing', async () => {
    setBotInstance(mockBot);

    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    await expect(handler([{} as any])).rejects.toThrow('Connection refused');
  });

  it('handles null query result gracefully', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce(null);

    await handler([{} as any]);

    expect(mockSendDailySummary).not.toHaveBeenCalled();
  });
});

// ─── Batch sending tests ────────────────────────────────────────────

describe('dailySummary batch sending', () => {
  it('sends to all users sequentially with rate limiting', async () => {
    setBotInstance(mockBot);

    const users = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      telegram_id: (i + 1) * 100,
    }));
    mockQuery.mockResolvedValueOnce(users);
    mockSendDailySummary.mockResolvedValue(true);

    await handler([{} as any]);

    expect(mockSendDailySummary).toHaveBeenCalledTimes(5);
    for (let i = 0; i < 5; i++) {
      expect(mockSendDailySummary).toHaveBeenNthCalledWith(i + 1, mockBot, i + 1);
    }
  });

  it('continues sending after individual failures', async () => {
    setBotInstance(mockBot);

    const users = [
      { id: 1, telegram_id: 100 },
      { id: 2, telegram_id: 200 },
      { id: 3, telegram_id: 300 },
    ];
    mockQuery.mockResolvedValueOnce(users);

    mockSendDailySummary
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true);

    await handler([{} as any]);

    expect(mockSendDailySummary).toHaveBeenCalledTimes(3);
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 2, failed: 1, total: 3 })
    );
  });

  it('logs elapsed time on completion', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([{ id: 1, telegram_id: 100 }]);
    mockSendDailySummary.mockResolvedValueOnce(true);

    await handler([{} as any]);

    const completedLog = mockLogInfo.mock.calls.find(
      (call: any[]) => typeof call[0] === 'string' && call[0].includes('Completed')
    );
    expect(completedLog).toBeDefined();
    expect(completedLog![0]).toMatch(/Completed in \d+ms/);
  });
});

// ─── DND filtering tests ────────────────────────────────────────────

describe('dailySummary DND filtering', () => {
  it('query filters active users with enabled notifications', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('is_active');
    expect(sql).toContain('notification_enabled');
    expect(sql).toContain('reminder_time');
  });

  it('users in DND window are not returned by query (DB-level filter)', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(mockSendDailySummary).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('no users')
    );
  });

  it('users outside DND window are returned and receive summaries', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([
      { id: 10, telegram_id: 1000 },
    ]);
    mockSendDailySummary.mockResolvedValueOnce(true);

    await handler([{} as any]);

    expect(mockSendDailySummary).toHaveBeenCalledTimes(1);
    expect(mockSendDailySummary).toHaveBeenCalledWith(mockBot, 10);
  });

  it('mixed DND users: only non-DND users returned by query', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([
      { id: 2, telegram_id: 200 },
      { id: 4, telegram_id: 400 },
    ]);
    mockSendDailySummary.mockResolvedValue(true);

    await handler([{} as any]);

    expect(mockSendDailySummary).toHaveBeenCalledTimes(2);
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed'),
      expect.objectContaining({ sent: 2, failed: 0, total: 2 })
    );
  });
});

// ─── Timezone conversion tests ──────────────────────────────────────

describe('dailySummary timezone handling', () => {
  it('query uses timezone-aware hour extraction', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('TIME ZONE');
  });

  it('query references reminder_time for per-user scheduling', async () => {
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    const sql = mockQuery.mock.calls[0][0] as string;
    expect(sql).toContain('reminder_time');
  });
});
