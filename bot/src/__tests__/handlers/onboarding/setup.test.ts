/**
 * Tests for onboarding/setup.ts (handleOnboarding entry point)
 *
 * Tests: welcome message, user identification, mode selection trigger,
 *        delay behavior, error cases.
 * Mocks: db (query, queryOne, execute), Grammy context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

vi.mock('../../../utils/queries.js', () => ({
  getUserByTelegramId: (...args: any[]) => mockQueryOne(...args),
  listAllModes: () => mockQuery(),
  getUserActiveModes: (...args: any[]) => mockQuery(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleOnboarding } from '../../../handlers/onboarding/setup.js';

// ─── Helpers ─────────────────────────────────────────────────────────

const MODES = [
  { id: 1, display_name: 'Fitness', name: 'fitness', icon_emoji: '💪', description: 'Track fitness goals' },
  { id: 2, display_name: 'Hydration', name: 'hydration', icon_emoji: '💧', description: 'Stay hydrated' },
];

function createMockCtx(telegramId?: number, firstName?: string) {
  return {
    from: telegramId
      ? { id: telegramId, first_name: firstName || 'TestUser', username: 'testuser' }
      : undefined,
    callbackQuery: undefined as any,
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('handleOnboarding (setup)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send welcome message with user first name', async () => {
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(123, 'Alice');
    const promise = handleOnboarding(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    const welcomeMsg = ctx.reply.mock.calls[0][0] as string;
    expect(welcomeMsg).toContain('Welcome');
    expect(welcomeMsg).toContain('Alice');
    expect(ctx.reply.mock.calls[0][1]).toEqual({ parse_mode: 'Markdown' });
  });

  it('should use "there" as fallback when first_name is missing', async () => {
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(123);
    ctx.from = { id: 123, username: 'testuser' }; // no first_name
    const promise = handleOnboarding(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    const welcomeMsg = ctx.reply.mock.calls[0][0] as string;
    expect(welcomeMsg).toContain('there');
  });

  it('should show mode selection after welcome message with delay', async () => {
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(123, 'Bob');
    const promise = handleOnboarding(ctx);

    // Before the delay, only welcome message should be sent
    expect(ctx.reply).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // After delay, mode selection message should also be sent
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    const modeMsg = ctx.reply.mock.calls[1][0] as string;
    expect(modeMsg).toContain('Choose Your Modes');
  });

  it('should return early and show error if userId is missing', async () => {
    const ctx = createMockCtx(); // no from

    await handleOnboarding(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith('Error: Unable to identify user.');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should not call mode selection before timeout resolves', async () => {
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(123, 'TestUser');
    const promise = handleOnboarding(ctx);

    // Advance only 500ms — not enough
    await vi.advanceTimersByTimeAsync(500);

    // Only welcome message should exist
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    expect(ctx.reply.mock.calls[0][0]).toContain('Welcome');

    // Complete the timer
    await vi.advanceTimersByTimeAsync(1000);
    await promise;

    expect(ctx.reply).toHaveBeenCalledTimes(2);
  });

  it('should handle mode loading failure gracefully', async () => {
    // listAllModes returns empty → showModeSelection shows error
    mockQuery.mockResolvedValue([]);

    const ctx = createMockCtx(123, 'TestUser');
    const promise = handleOnboarding(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Welcome message + error message
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    expect(ctx.reply.mock.calls[1][0]).toContain('Error loading modes');
  });

  it('should send welcome message in Markdown format', async () => {
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(456, 'Charlie');
    const promise = handleOnboarding(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Both messages should use Markdown
    expect(ctx.reply.mock.calls[0][1]).toHaveProperty('parse_mode', 'Markdown');
    expect(ctx.reply.mock.calls[1][1]).toHaveProperty('parse_mode', 'Markdown');
  });
});
