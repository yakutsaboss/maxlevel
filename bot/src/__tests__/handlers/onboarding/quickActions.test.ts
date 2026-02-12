/**
 * Tests for onboarding/quickActions.ts
 *
 * Tests: handleQuickAction dispatch (open_app, view_quests, view_profile),
 *        quest list display (active / empty / overflow), profile overview,
 *        missing user guard, missing callback data guard.
 * Mocks: db (query, queryOne), queries (getUserByTelegramId), Grammy context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  getPool: vi.fn(),
}));

const mockGetUserByTelegramId = vi.fn();

vi.mock('../../../utils/queries.js', () => ({
  getUserByTelegramId: (...args: any[]) => mockGetUserByTelegramId(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleQuickAction } from '../../../handlers/onboarding/quickActions.js';

// ─── Helpers ─────────────────────────────────────────────────────────

const DB_USER = { id: 42, telegram_id: 123, current_level: 5, total_xp: 1200 };

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    from: { id: 123, first_name: 'TestUser', username: 'testuser' },
    callbackQuery: undefined as any,
    reply: vi.fn(),
    answerCallbackQuery: vi.fn(),
    ...overrides,
  } as any;
}

function makeQuest(index: number, status = 'in_progress') {
  return {
    mode_icon: ['💪', '💧', '📚', null, '🏃'][index % 5],
    name: `Quest ${index + 1}`,
    status,
    xp_reward: 50 * (index + 1),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('handleQuickAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return early when callback data is missing', async () => {
    const ctx = createMockCtx({ callbackQuery: undefined });
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('should open mini app on open_app action', async () => {
    const ctx = createMockCtx({ callbackQuery: { data: 'open_app' } });
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('Mini App');
    const opts = ctx.reply.mock.calls[0][1];
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show active quests list on view_quests action', async () => {
    mockGetUserByTelegramId.mockResolvedValue(DB_USER);
    mockQuery.mockResolvedValue([
      makeQuest(0, 'in_progress'),
      makeQuest(1, 'pending'),
    ]);

    const ctx = createMockCtx({ callbackQuery: { data: 'view_quests' } });
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledTimes(1);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('Active Quests');
    expect(msg).toContain('Quest 1');
    expect(msg).toContain('Quest 2');
    expect(msg).toContain('🔄'); // in_progress icon
    expect(msg).toContain('⏳'); // pending icon
    expect(ctx.reply.mock.calls[0][1]).toEqual({ parse_mode: 'Markdown' });
  });

  it('should show empty state when no active quests', async () => {
    mockGetUserByTelegramId.mockResolvedValue(DB_USER);
    mockQuery.mockResolvedValue([]);

    const ctx = createMockCtx({ callbackQuery: { data: 'view_quests' } });
    await handleQuickAction(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('no active quests');
  });

  it('should truncate quests list at 5 and show overflow count', async () => {
    mockGetUserByTelegramId.mockResolvedValue(DB_USER);
    const quests = Array.from({ length: 7 }, (_, i) => makeQuest(i));
    mockQuery.mockResolvedValue(quests);

    const ctx = createMockCtx({ callbackQuery: { data: 'view_quests' } });
    await handleQuickAction(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('Quest 5');
    expect(msg).not.toContain('Quest 6');
    expect(msg).toContain('and 2 more');
  });

  it('should show error when user not found for view_quests', async () => {
    mockGetUserByTelegramId.mockResolvedValue(null);

    const ctx = createMockCtx({ callbackQuery: { data: 'view_quests' } });
    await handleQuickAction(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading quests.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should show profile overview with stats on view_profile action', async () => {
    mockGetUserByTelegramId.mockResolvedValue(DB_USER);
    mockQuery.mockResolvedValue([{ current_streak: 3 }, { current_streak: 7 }]);
    mockQueryOne.mockResolvedValue({ total: 15 });

    const ctx = createMockCtx({ callbackQuery: { data: 'view_profile' } });
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledTimes(1);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain("TestUser's Profile");
    expect(msg).toContain('Level: 5');
    expect(msg).toContain('Total XP: 1200');
    expect(msg).toContain('Streak: 3 days'); // min of 3 and 7
    expect(msg).toContain('Quests Completed: 15');
    expect(ctx.reply.mock.calls[0][1]).toEqual({ parse_mode: 'Markdown' });
  });

  it('should show error when user not found for view_profile', async () => {
    mockGetUserByTelegramId.mockResolvedValue(null);

    const ctx = createMockCtx({ callbackQuery: { data: 'view_profile' } });
    await handleQuickAction(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading profile.');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockQueryOne).not.toHaveBeenCalled();
  });
});
