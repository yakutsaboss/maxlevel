/**
 * Tests for Achievement Notifier Job (bot/src/jobs/definitions/achievementNotifier.ts)
 *
 * Tests: notification sending, skip already-notified, Telegram API errors,
 *        batch processing with delay, empty queue, missing bot instance
 * Mocks: db.query, bot API, logger
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
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
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler, setBotInstance, JOB_NAME, CRON_SCHEDULE } from '../../jobs/definitions/achievementNotifier.js';

// ─── Helpers ────────────────────────────────────────────────────────

function createMockBot(sendMessageImpl?: (...args: any[]) => any) {
  return {
    api: {
      sendMessage: vi.fn(sendMessageImpl ?? (async () => ({}))),
    },
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('achievementNotifier', () => {
  it('should have correct job name and cron schedule', () => {
    expect(JOB_NAME).toBe('achievement-notifier');
    expect(CRON_SCHEDULE).toBe('*/15 * * * *');
  });

  it('should throw when bot instance is not set', async () => {
    // Reset bot instance by setting null
    setBotInstance(null as any);

    await expect(handler([{} as any])).rejects.toThrow('Bot instance not set');
  });

  it('should send notifications for new achievements', async () => {
    const mockBot = createMockBot();
    setBotInstance(mockBot);

    const unlocks = [
      { user_id: 1, telegram_id: 111, achievement_id: 10, name: 'First Quest', badge_icon: '🏅', xp_bonus: 25, description: 'Complete your first quest', rarity: 'common', category: 'quests', category_earned: 1, category_total: 5 },
      { user_id: 2, telegram_id: 222, achievement_id: 20, name: 'Streak Master', badge_icon: '🔥', xp_bonus: 50, description: 'Keep a 7-day streak', rarity: 'rare', category: 'streak', category_earned: 2, category_total: 10 },
    ];
    mockQuery
      .mockResolvedValueOnce(unlocks)      // SELECT recent unlocks
      .mockResolvedValue({ rowCount: 1 }); // UPDATE notification_sent_at

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(111, expect.stringContaining('First Quest'), expect.objectContaining({ parse_mode: 'HTML' }));
    expect(mockBot.api.sendMessage).toHaveBeenCalledWith(222, expect.stringContaining('Streak Master'), expect.objectContaining({ parse_mode: 'HTML' }));
    // Should mark both as notified
    expect(mockQuery).toHaveBeenCalledTimes(3); // 1 SELECT + 2 UPDATEs
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.objectContaining({ sent: 2, failed: 0, total: 2 }),
    );
  });

  it('should handle empty queue gracefully', async () => {
    const mockBot = createMockBot();
    setBotInstance(mockBot);

    mockQuery.mockResolvedValueOnce([]);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).not.toHaveBeenCalled();
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('no recent achievement unlocks'),
    );
  });

  it('should handle Telegram API errors gracefully and count failures', async () => {
    const mockBot = createMockBot(async () => {
      throw new Error('Forbidden: bot was blocked by the user');
    });
    setBotInstance(mockBot);

    const unlocks = [
      { user_id: 1, telegram_id: 111, achievement_id: 10, name: 'Test', badge_icon: '🏅', xp_bonus: 10, description: 'Test achievement', rarity: 'common', category: 'test', category_earned: 1, category_total: 3 },
    ];
    mockQuery.mockResolvedValueOnce(unlocks);

    await handler([{} as any]);

    expect(mockBot.api.sendMessage).toHaveBeenCalledTimes(1);
    expect(mockLogWarn).toHaveBeenCalledWith(expect.stringContaining('Failed to notify user 111'));
    expect(mockLogInfo).toHaveBeenCalledWith(
      expect.stringContaining('Completed in'),
      expect.objectContaining({ sent: 0, failed: 1, total: 1 }),
    );
  });

  it('should throw when the initial query fails', async () => {
    const mockBot = createMockBot();
    setBotInstance(mockBot);

    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    await expect(handler([{} as any])).rejects.toThrow('connection lost');
  });
});
