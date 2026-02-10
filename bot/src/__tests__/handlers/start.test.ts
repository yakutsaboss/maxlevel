/**
 * Tests for /start bot command handler (bot/src/handlers/start.ts)
 *
 * Mocks: db (query, queryOne, execute),
 *        bot (getUserName, getTelegramId, sendMarkdownMessage),
 *        onboarding (handleOnboarding)
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

const mockHandleOnboarding = vi.fn();

vi.mock('../../handlers/onboarding.js', () => ({
  handleOnboarding: (...args: any[]) => mockHandleOnboarding(...args),
}));

// Mock bot.ts helpers — they are simple wrappers, mock them to control behavior
const mockGetUserName = vi.fn();
const mockGetTelegramId = vi.fn();
const mockSendMarkdownMessage = vi.fn();

vi.mock('../../bot.js', () => ({
  getUserName: (...args: any[]) => mockGetUserName(...args),
  getTelegramId: (...args: any[]) => mockGetTelegramId(...args),
  sendMarkdownMessage: (...args: any[]) => mockSendMarkdownMessage(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleStart } from '../../handlers/start.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    from: { id: 123456789, first_name: 'TestUser', username: 'testuser' },
    reply: vi.fn(),
    session: {},
    ...overrides,
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('handleStart', () => {
  it('should welcome back existing user with level, XP, and quest count', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123456789);
    mockGetUserName.mockReturnValue('Alice');

    const existingUser = {
      id: 1,
      current_level: 5,
      total_xp: 2500,
      is_active: true,
    };

    // getUserByTelegramId → queryOne returns user directly
    mockQueryOne.mockResolvedValueOnce(existingUser);

    // getActiveQuests → query returns quest rows directly
    mockQuery.mockResolvedValueOnce([
      { id: 1, name: 'Quest 1' },
      { id: 2, name: 'Quest 2' },
      { id: 3, name: 'Quest 3' },
    ]);

    await handleStart(ctx);

    // Should set session data
    expect(ctx.session.userId).toBe(1);
    expect(ctx.session.telegramId).toBe(123456789);

    // Should send welcome-back message via sendMarkdownMessage
    expect(mockSendMarkdownMessage).toHaveBeenCalledTimes(1);
    const msg = mockSendMarkdownMessage.mock.calls[0][1] as string;
    expect(msg).toContain('Welcome back');
    expect(msg).toContain('Alice');
    expect(msg).toContain('Level 5');
    expect(msg).toContain('2500 XP');
    expect(msg).toContain('3 active quests');

    // Should send quick action keyboard
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.reply.mock.calls[0][1]).toHaveProperty('reply_markup');
  });

  it('should welcome back existing user even if quest fetch fails', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123456789);
    mockGetUserName.mockReturnValue('Bob');

    // getUserByTelegramId → queryOne returns user
    mockQueryOne.mockResolvedValueOnce({ id: 2, current_level: 3, total_xp: 800, is_active: true });

    // getActiveQuests → query throws (DB error)
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    await handleStart(ctx);

    expect(mockSendMarkdownMessage).toHaveBeenCalledTimes(1);
    const msg = mockSendMarkdownMessage.mock.calls[0][1] as string;
    expect(msg).toContain('Welcome back');
    expect(msg).toContain("Couldn't load quests");
  });

  it('should create new user and start onboarding when user does not exist', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(999);
    mockGetUserName.mockReturnValue('NewUser');

    // getUserByTelegramId → queryOne returns null (not found)
    mockQueryOne.mockResolvedValueOnce(null);

    // createUser → queryOne returns new user row from INSERT ... RETURNING *
    mockQueryOne.mockResolvedValueOnce({ id: 42 });

    await handleStart(ctx);

    // Should set session data
    expect(ctx.session.userId).toBe(42);

    // Should start onboarding
    expect(mockHandleOnboarding).toHaveBeenCalledWith(ctx);
  });

  it('should reply with error when telegramId is missing', async () => {
    const ctx = createMockCtx({ from: undefined });
    mockGetTelegramId.mockReturnValue(undefined);

    await handleStart(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Could not identify your Telegram account.');
    expect(mockQueryOne).not.toHaveBeenCalled();
  });

  it('should handle "duplicate/already exists" error on user creation', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    // getUserByTelegramId → null
    mockQueryOne.mockResolvedValueOnce(null);
    // createUser → throws duplicate key error
    mockQueryOne.mockRejectedValueOnce(new Error('duplicate key - user already exists'));

    await handleStart(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('already exists');
    expect(msg).toContain('try /start again');
  });

  it('should handle "connection" error on user creation', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockResolvedValueOnce(null);
    mockQueryOne.mockRejectedValueOnce(new Error('connection refused'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('temporarily unavailable');
  });

  it('should handle generic error on user creation', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockResolvedValueOnce(null);
    mockQueryOne.mockRejectedValueOnce(new Error('some unknown error'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain("Couldn't create your account");
  });

  it('should handle ECONNREFUSED exception', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockRejectedValue(new Error('ECONNREFUSED'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('temporarily offline');
  });

  it('should handle timeout exception', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockRejectedValue(new Error('ETIMEDOUT'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('timed out');
  });

  it('should handle database exception', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockRejectedValue(new Error('connection pool exhausted'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('temporarily offline');
  });

  it('should handle generic unhandled exception', async () => {
    const ctx = createMockCtx();
    mockGetTelegramId.mockReturnValue(123);
    mockGetUserName.mockReturnValue('User');

    mockQueryOne.mockRejectedValue(new Error('something random'));

    await handleStart(ctx);

    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('Something went wrong');
  });
});
