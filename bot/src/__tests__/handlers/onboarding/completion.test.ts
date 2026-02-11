/**
 * Tests for onboarding/completion.ts (completeModeSelection + assignInitialQuests)
 *
 * Tests: successful completion with quest assignment, no-modes guard,
 *        no user found, no quest templates, assigned quest count message,
 *        error handling on insert failure.
 * Mocks: db (query, queryOne, execute), queries, Grammy context
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

const mockGetUserByTelegramId = vi.fn();
const mockGetUserActiveModes = vi.fn();

vi.mock('../../../utils/queries.js', () => ({
  getUserByTelegramId: (...args: any[]) => mockGetUserByTelegramId(...args),
  listAllModes: vi.fn(),
  getUserActiveModes: (...args: any[]) => mockGetUserActiveModes(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { completeModeSelection } from '../../../handlers/onboarding/completion.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    from: { id: 123, first_name: 'TestUser', username: 'testuser' },
    callbackQuery: { data: 'mode_done' },
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
    ...overrides,
  } as any;
}

const SELECTED_MODES = [
  { mode_id: 1, icon_emoji: '💪', display_name: 'Fitness', name: 'fitness' },
  { mode_id: 2, icon_emoji: '💧', display_name: 'Hydration', name: 'hydration' },
];

const QUEST_TEMPLATES = [
  { id: 10, title: 'Morning Run', xp_reward: 50, difficulty: 'easy', mode_id: 1 },
  { id: 11, title: 'Drink 2L Water', xp_reward: 30, difficulty: 'medium', mode_id: 2 },
  { id: 12, title: '30 Push-ups', xp_reward: 80, difficulty: 'hard', mode_id: 1 },
];

// ─── Tests ───────────────────────────────────────────────────────────

describe('completeModeSelection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should complete onboarding and assign quests on success', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes.mockResolvedValue(SELECTED_MODES);
    // query for mode_ids, then query for quest templates
    mockQuery
      .mockResolvedValueOnce([{ mode_id: 1 }, { mode_id: 2 }]) // user's active mode IDs
      .mockResolvedValueOnce(QUEST_TEMPLATES); // quest templates
    mockExecute.mockResolvedValue(1);

    const ctx = createMockCtx();
    const promise = completeModeSelection(ctx);

    // Advance past the 1000ms delay
    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Should edit message to show selected modes
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const editMsg = ctx.editMessageText.mock.calls[0][0] as string;
    expect(editMsg).toContain('Modes Selected');
    expect(editMsg).toContain('2 mode(s)');

    // Should assign quests (3 execute calls for 3 templates)
    expect(mockExecute).toHaveBeenCalledTimes(3);

    // Should reply with "You're All Set" + action buttons
    const allReplies = ctx.reply.mock.calls.map((c: any[]) => c[0] as string);
    expect(allReplies.some((msg: string) => msg.includes('Assigning Your First Quests'))).toBe(true);
    expect(allReplies.some((msg: string) => msg.includes("You're All Set"))).toBe(true);
  });

  it('should show alert when no modes selected', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes.mockResolvedValue([]); // no modes

    const ctx = createMockCtx();
    await completeModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: '⚠️ Please select at least one mode!',
      show_alert: true,
    });
    // Should NOT proceed to quest assignment
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('should show error when user not found', async () => {
    mockGetUserByTelegramId.mockResolvedValue(null);

    const ctx = createMockCtx();
    await completeModeSelection(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error completing setup. Please try again.');
    expect(mockGetUserActiveModes).not.toHaveBeenCalled();
  });

  it('should handle no quest templates gracefully', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes.mockResolvedValue(SELECTED_MODES);
    mockQuery
      .mockResolvedValueOnce([{ mode_id: 1 }]) // active mode IDs
      .mockResolvedValueOnce([]); // no quest templates

    const ctx = createMockCtx();
    const promise = completeModeSelection(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Should show "Setup Complete" fallback
    const allReplies = ctx.reply.mock.calls.map((c: any[]) => c[0] as string);
    expect(allReplies.some((msg: string) => msg.includes('Setup Complete'))).toBe(true);
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('should skip duplicate quest inserts without crashing', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes.mockResolvedValue(SELECTED_MODES);
    mockQuery
      .mockResolvedValueOnce([{ mode_id: 1 }])
      .mockResolvedValueOnce([QUEST_TEMPLATES[0]]); // 1 template
    // Simulate constraint violation on insert
    mockExecute.mockRejectedValueOnce(new Error('duplicate key'));

    const ctx = createMockCtx();
    const promise = completeModeSelection(ctx);

    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // Should NOT crash, should show Setup Complete (0 assigned)
    const allReplies = ctx.reply.mock.calls.map((c: any[]) => c[0] as string);
    expect(allReplies.some((msg: string) => msg.includes('Setup Complete'))).toBe(true);
  });

  it('should return early when userId is missing', async () => {
    const ctx = createMockCtx({ from: undefined });
    await completeModeSelection(ctx);

    expect(mockGetUserByTelegramId).not.toHaveBeenCalled();
    expect(ctx.reply).not.toHaveBeenCalled();
  });
});
