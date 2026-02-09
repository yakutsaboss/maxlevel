/**
 * Tests for daily summary notification handler (bot/src/handlers/dailySummary.ts)
 *
 * Mocks: db (queryOne), bot.api.sendMessage
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQueryOne = vi.fn();

vi.mock('../../utils/db.js', () => ({
  queryOne: (...args: any[]) => mockQueryOne(...args),
  query: vi.fn(),
  getPool: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { sendDailySummary } from '../../handlers/dailySummary.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockBot() {
  return {
    api: {
      sendMessage: vi.fn(),
    },
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('sendDailySummary', () => {
  it('should send formatted summary with quests and XP', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: 123456789,
      first_name: 'Alice',
      current_level: 5,
      total_xp: 2500,
      quests_today: 3,
      xp_today: 150,
      current_streak: 7,
    });

    const bot = createMockBot();
    const result = await sendDailySummary(bot, 1);

    expect(result).toBe(true);
    expect(bot.api.sendMessage).toHaveBeenCalledTimes(1);

    const [chatId, msg, opts] = bot.api.sendMessage.mock.calls[0];
    expect(chatId).toBe(123456789);
    expect(msg).toContain('Daily Summary for Alice');
    expect(msg).toContain('3');  // quests today
    expect(msg).toContain('150');  // xp today
    expect(msg).toContain('7 days');  // streak
    expect(msg).toContain('Level 5');
    expect(msg).toContain('2500 total XP');
    // 3 quests → "Amazing work" motivational message
    expect(msg).toContain('Amazing work');
    expect(opts.parse_mode).toBe('Markdown');
  });

  it('should send summary for user with no activity today', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: 987654321,
      first_name: 'Bob',
      current_level: 2,
      total_xp: 100,
      quests_today: 0,
      xp_today: 0,
      current_streak: 0,
    });

    const bot = createMockBot();
    const result = await sendDailySummary(bot, 2);

    expect(result).toBe(true);
    const msg = bot.api.sendMessage.mock.calls[0][1] as string;
    expect(msg).toContain('No quests completed yet today');
    // 0 quests → "There's still time" motivational message
    expect(msg).toContain("There's still time");
    // No streak line when streak is 0
    expect(msg).not.toContain('Current streak');
  });

  it('should show "Good progress" for 1-2 quests completed', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: 111111111,
      first_name: 'Charlie',
      current_level: 3,
      total_xp: 300,
      quests_today: 2,
      xp_today: 80,
      current_streak: 3,
    });

    const bot = createMockBot();
    await sendDailySummary(bot, 3);

    const msg = bot.api.sendMessage.mock.calls[0][1] as string;
    expect(msg).toContain('Good progress');
    expect(msg).toContain('3 days');
  });

  it('should return false when user not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const bot = createMockBot();
    const result = await sendDailySummary(bot, 999);

    expect(result).toBe(false);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should return false when user has no telegram_id', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: null,
      first_name: 'Ghost',
      current_level: 1,
      total_xp: 0,
      quests_today: 0,
      xp_today: 0,
      current_streak: 0,
    });

    const bot = createMockBot();
    const result = await sendDailySummary(bot, 5);

    expect(result).toBe(false);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should return false on DB error', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('Connection refused'));

    const bot = createMockBot();
    const result = await sendDailySummary(bot, 1);

    expect(result).toBe(false);
    expect(bot.api.sendMessage).not.toHaveBeenCalled();
  });

  it('should return false on bot.api.sendMessage failure', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: 123456789,
      first_name: 'Dave',
      current_level: 1,
      total_xp: 50,
      quests_today: 1,
      xp_today: 25,
      current_streak: 1,
    });

    const bot = createMockBot();
    bot.api.sendMessage.mockRejectedValueOnce(new Error('Forbidden: bot was blocked by the user'));

    const result = await sendDailySummary(bot, 4);

    expect(result).toBe(false);
  });

  it('should use "Adventurer" as fallback name when first_name is null', async () => {
    mockQueryOne.mockResolvedValueOnce({
      telegram_id: 555555555,
      first_name: null,
      current_level: 1,
      total_xp: 0,
      quests_today: 0,
      xp_today: 0,
      current_streak: 0,
    });

    const bot = createMockBot();
    await sendDailySummary(bot, 6);

    const msg = bot.api.sendMessage.mock.calls[0][1] as string;
    expect(msg).toContain('Daily Summary for Adventurer');
  });
});
