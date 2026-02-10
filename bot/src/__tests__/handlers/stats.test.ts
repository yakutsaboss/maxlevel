/**
 * Tests for /stats bot command handler (bot/src/handlers/stats.ts)
 *
 * Tests: handleStats (weekly view by default), handleStatsCallback (week/all toggle)
 * Mocks: db (query, queryOne), Grammy context
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: vi.fn(),
  getPool: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleStats, handleStatsCallback } from '../../handlers/stats.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockCtx(telegramId?: number, firstName?: string) {
  return {
    from: telegramId
      ? { id: telegramId, first_name: firstName || 'TestUser' }
      : undefined,
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

function createCallbackCtx(data: string, telegramId: number = 123, firstName: string = 'TestUser') {
  return {
    from: { id: telegramId, first_name: firstName },
    callbackQuery: { data },
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

function mockUserLookup(userId: number | null) {
  // getInternalUserId → queryOne returns user row or null
  mockQueryOne.mockResolvedValueOnce(userId ? { id: userId } : null);
}

function mockStreaks(streaks: any[] = []) {
  // getStreaks → query returns streak rows directly
  mockQuery.mockResolvedValueOnce(streaks);
}

// ─── Tests: handleStats ─────────────────────────────────────────────

describe('handleStats', () => {
  it('should show weekly stats with XP, quests, and streaks', async () => {
    mockUserLookup(1);

    // getWeeklyStats query
    mockQuery.mockResolvedValueOnce([{ weekly_xp: 350, quests_completed: 5 }]);
    // getStreaks
    mockStreaks([
      { display_name: 'Fitness', icon_emoji: '💪', current_streak: 7 },
      { display_name: 'Hydration', icon_emoji: '💧', current_streak: 3 },
    ]);

    const ctx = createMockCtx(123, 'Alice');
    await handleStats(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Weekly Stats');
    expect(text).toContain('Alice');
    expect(text).toContain('350');
    expect(text).toContain('5');
    expect(text).toContain('Fitness');
    expect(text).toContain('7 day');
    expect(text).toContain('Hydration');
    expect(opts.parse_mode).toBe('Markdown');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show "No active streaks" when user has no streaks', async () => {
    mockUserLookup(1);
    mockQuery.mockResolvedValueOnce([{ weekly_xp: 0, quests_completed: 0 }]);
    mockStreaks([]);

    const ctx = createMockCtx(123, 'Bob');
    await handleStats(ctx);

    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('No active streaks');
  });

  it('should reply with error when ctx.from is missing', async () => {
    const ctx = createMockCtx(); // no from
    await handleStats(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Could not identify your account.');
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('should reply with error when user not found', async () => {
    mockUserLookup(null);

    const ctx = createMockCtx(123);
    await handleStats(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Profile not found. Please /start first.');
  });

  it('should handle missing weekly stats row gracefully', async () => {
    mockUserLookup(1);
    mockQuery.mockResolvedValueOnce([]); // empty result
    mockStreaks([]);

    const ctx = createMockCtx(123, 'User');
    await handleStats(ctx);

    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('0');
  });
});

// ─── Tests: handleStatsCallback ─────────────────────────────────────

describe('handleStatsCallback', () => {
  it('should return early if callback data is missing', async () => {
    const ctx = {
      from: { id: 123, first_name: 'User' },
      callbackQuery: { data: undefined },
      reply: vi.fn(),
      editMessageText: vi.fn(),
      answerCallbackQuery: vi.fn(),
    } as any;

    await handleStatsCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should return early if data does not start with stats:', async () => {
    const ctx = createCallbackCtx('other:data');
    await handleStatsCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should show weekly stats on stats:week callback', async () => {
    mockUserLookup(1);
    mockStreaks([{ display_name: 'Fitness', icon_emoji: '💪', current_streak: 5 }]);
    mockQuery.mockResolvedValueOnce([{ weekly_xp: 200, quests_completed: 3 }]);

    const ctx = createCallbackCtx('stats:week', 123, 'Alice');
    await handleStatsCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('Weekly Stats');
    expect(text).toContain('200');
    expect(opts.parse_mode).toBe('Markdown');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should show all-time stats on stats:all callback', async () => {
    mockUserLookup(1);
    mockStreaks([{ display_name: 'Fitness', icon_emoji: '💪', best_streak: 14 }]);
    mockQuery.mockResolvedValueOnce([{
      total_xp: 5000,
      current_level: 10,
      total_quests_completed: 42,
      created_at: '2025-01-01T00:00:00Z',
    }]);

    const ctx = createCallbackCtx('stats:all', 123, 'Alice');
    await handleStatsCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('All-Time Stats');
    expect(text).toContain('5000');
    expect(text).toContain('Level: 10');
    expect(text).toContain('42');
    expect(text).toContain('Joined');
    expect(text).toContain('14 day');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should answer with error when ctx.from is missing', async () => {
    const ctx = {
      from: undefined,
      callbackQuery: { data: 'stats:week' },
      reply: vi.fn(),
      editMessageText: vi.fn(),
      answerCallbackQuery: vi.fn(),
    } as any;

    await handleStatsCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '❌ Error' });
  });

  it('should answer with error when user not found', async () => {
    mockUserLookup(null);

    const ctx = createCallbackCtx('stats:week');
    await handleStatsCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '❌ Profile not found' });
  });

  it('should handle editMessageText error gracefully', async () => {
    mockUserLookup(1);
    mockStreaks([]);
    mockQuery.mockResolvedValueOnce([{ weekly_xp: 0, quests_completed: 0 }]);

    const ctx = createCallbackCtx('stats:week', 123, 'User');
    ctx.editMessageText.mockRejectedValueOnce(new Error('message is not modified'));

    await handleStatsCallback(ctx);

    // Should still call answerCallbackQuery even if editMessageText fails
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });
});
