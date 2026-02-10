/**
 * Tests for onboarding/modes handler (bot/src/handlers/onboarding.ts)
 *
 * Tests: handleOnboarding, showModeSelection, handleModeSelection,
 *        handleQuickAction, handleModesCommand, handleModeSummary
 * Mocks: db (query, queryOne, execute), Grammy context, setTimeout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

// ─── Import after mocks ─────────────────────────────────────────────

import {
  handleOnboarding,
  showModeSelection,
  handleModeSelection,
  handleQuickAction,
  handleModesCommand,
  handleModeSummary,
} from '../../handlers/onboarding.js';

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

function createCallbackCtx(data: string, telegramId: number = 123, firstName: string = 'TestUser') {
  return {
    from: { id: telegramId, first_name: firstName, username: 'testuser' },
    callbackQuery: { data },
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

// ─── Tests: handleOnboarding ────────────────────────────────────────

describe('handleOnboarding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should send welcome message and show mode selection', async () => {
    // listAllModes → query returns mode rows directly
    mockQuery.mockResolvedValue(MODES);

    const ctx = createMockCtx(123, 'Alice');
    const promise = handleOnboarding(ctx);

    // Fast-forward past the 1500ms delay
    await vi.advanceTimersByTimeAsync(1500);
    await promise;

    // First call: welcome message
    expect(ctx.reply).toHaveBeenCalledTimes(2);
    const welcomeMsg = ctx.reply.mock.calls[0][0] as string;
    expect(welcomeMsg).toContain('Welcome');
    expect(welcomeMsg).toContain('Alice');

    // Second call: mode selection (from showModeSelection)
    const modeMsg = ctx.reply.mock.calls[1][0] as string;
    expect(modeMsg).toContain('Choose Your Modes');
  });

  it('should return early if userId is missing', async () => {
    const ctx = createMockCtx(); // no from
    await handleOnboarding(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('Error: Unable to identify user.');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── Tests: showModeSelection ───────────────────────────────────────

describe('showModeSelection', () => {
  it('should show available modes with buttons', async () => {
    // listAllModes → query returns mode rows
    mockQuery.mockResolvedValueOnce(MODES);

    const ctx = createMockCtx(123);
    await showModeSelection(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Choose Your Modes');
    expect(opts.parse_mode).toBe('Markdown');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show error when modes fail to load', async () => {
    // query throws an error (DB failure)
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const ctx = createMockCtx(123);
    await showModeSelection(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading modes. Please try again later.');
  });

  it('should return early if userId is missing', async () => {
    const ctx = createMockCtx(); // no from
    await showModeSelection(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });
});

// ─── Tests: handleModeSelection ─────────────────────────────────────

describe('handleModeSelection', () => {
  it('should return early if callbackData is missing', async () => {
    const ctx = createCallbackCtx('');
    ctx.callbackQuery.data = undefined;

    await handleModeSelection(ctx);

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should show mode info on mode_info callback', async () => {
    // listAllModes → query returns mode rows
    mockQuery.mockResolvedValueOnce(MODES);

    const ctx = createCallbackCtx('mode_info');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('Mode Information');
    expect(text).toContain('Fitness');
    expect(text).toContain('Hydration');
  });

  it('should complete mode selection on mode_done with selected modes', async () => {
    // getUserByTelegramId → queryOne returns user row
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getUserActiveModes → query returns active modes
    mockQuery.mockResolvedValueOnce([{ mode_id: 1, display_name: 'Fitness', icon_emoji: '💪' }]);
    // assignInitialQuests → query for active mode IDs, templates, execute for inserts
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]); // active modes for quest assignment
    mockQuery.mockResolvedValueOnce([{ id: 10, difficulty: 'easy' }]); // available templates
    mockExecute.mockResolvedValueOnce(1); // insert quest instance

    const ctx = createCallbackCtx('mode_done');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    // Should call editMessageText with "Modes Selected!"
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const editText = ctx.editMessageText.mock.calls[0][0] as string;
    expect(editText).toContain('Modes Selected');
  });

  it('should warn when mode_done with no modes selected', async () => {
    // getUserByTelegramId → queryOne returns user row
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getUserActiveModes → empty array
    mockQuery.mockResolvedValueOnce([]);

    const ctx = createCallbackCtx('mode_done');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: '⚠️ Please select at least one mode!',
      show_alert: true,
    });
  });

  it('should add mode when mode not currently selected', async () => {
    // getUserByTelegramId → queryOne returns user
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getUserActiveModes → none selected
    mockQuery.mockResolvedValueOnce([]);
    // addMode: queryOne to look up mode, queryOne to check existing, execute to insert
    mockQueryOne.mockResolvedValueOnce({ id: 1, name: 'fitness' }); // mode lookup
    mockQueryOne.mockResolvedValueOnce(null); // no existing user_mode
    mockExecute.mockResolvedValueOnce(1); // insert user_mode
    mockExecute.mockResolvedValueOnce(1); // init streak
    // updateModeSelectionMessage: listModes + getActiveModes
    mockQuery.mockResolvedValueOnce(MODES);
    mockQuery.mockResolvedValueOnce([{ mode_id: 1, display_name: 'Fitness', icon_emoji: '💪' }]);

    const ctx = createCallbackCtx('mode_select_1');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '✅ Mode added!' });
  });

  it('should remove mode when mode is currently selected', async () => {
    // getUserByTelegramId → queryOne returns user
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getUserActiveModes → mode 1 already selected
    mockQuery.mockResolvedValueOnce([{ mode_id: 1, display_name: 'Fitness', icon_emoji: '💪' }]);
    // removeMode → execute UPDATE
    mockExecute.mockResolvedValueOnce(1);
    // updateModeSelectionMessage: listModes + getActiveModes
    mockQuery.mockResolvedValueOnce(MODES);
    mockQuery.mockResolvedValueOnce([]);

    const ctx = createCallbackCtx('mode_select_1');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '➖ Mode removed!' });
  });

  it('should handle getUserByTelegramId failure on mode select', async () => {
    // queryOne returns null (user not found)
    mockQueryOne.mockResolvedValueOnce(null);

    const ctx = createCallbackCtx('mode_select_1');
    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '❌ Error. Please try again.' });
  });
});

// ─── Tests: handleQuickAction ───────────────────────────────────────

describe('handleQuickAction', () => {
  it('should return early if action is missing', async () => {
    const ctx = createCallbackCtx('');
    ctx.callbackQuery.data = undefined;

    await handleQuickAction(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('should show mini app button on open_app', async () => {
    const ctx = createCallbackCtx('open_app');
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];
    expect(text).toContain('Mini App');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show quests on view_quests', async () => {
    // getUserByTelegramId → queryOne
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getActiveQuests → query returns quest rows directly
    mockQuery.mockResolvedValueOnce([
      { name: 'Run 5km', status: 'pending', xp_reward: 50, mode_icon: '💪' },
    ]);

    const ctx = createCallbackCtx('view_quests');
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('Active Quests');
    expect(text).toContain('Run 5km');
  });

  it('should show profile on view_profile', async () => {
    // getUserByTelegramId → queryOne
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getStats → queryOne returns user stats directly
    mockQueryOne.mockResolvedValueOnce({
      current_level: 5,
      total_xp: 1200,
      overall_streak: 3,
      total_quests_completed: 10,
    });

    const ctx = createCallbackCtx('view_profile');
    await handleQuickAction(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('Profile');
    expect(text).toContain('Level: 5');
    expect(text).toContain('1200');
  });
});

// ─── Tests: handleModesCommand ──────────────────────────────────────

describe('handleModesCommand', () => {
  it('should return early if userId is missing', async () => {
    const ctx = createMockCtx(); // no from
    await handleModesCommand(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should show active modes with manage options', async () => {
    // getUserByTelegramId → queryOne
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getUserActiveModes → query returns active modes
    mockQuery.mockResolvedValueOnce([
      { mode_id: 1, display_name: 'Fitness', icon_emoji: '💪' },
      { mode_id: 2, display_name: 'Hydration', icon_emoji: '💧' },
    ]);

    const ctx = createMockCtx(123);
    await handleModesCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Active Modes');
    expect(text).toContain('Fitness');
    expect(text).toContain('Hydration');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show "no modes" message when user has no active modes', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    mockQuery.mockResolvedValueOnce([]);

    const ctx = createMockCtx(123);
    await handleModesCommand(ctx);

    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain("haven't selected any modes");
  });

  it('should handle getUserByTelegramId failure', async () => {
    // queryOne returns null (user not found)
    mockQueryOne.mockResolvedValueOnce(null);

    const ctx = createMockCtx(123);
    await handleModesCommand(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading your modes.');
  });
});

// ─── Tests: handleModeSummary ───────────────────────────────────────

describe('handleModeSummary', () => {
  it('should return early if userId is missing', async () => {
    const ctx = createMockCtx(); // no from
    await handleModeSummary(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
  });

  it('should show mode summary with active mode count', async () => {
    // getUserByTelegramId → queryOne
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getModeSummary: query all modes + query user_modes to compute summary
    mockQuery.mockResolvedValueOnce(MODES); // all modes
    mockQuery.mockResolvedValueOnce([
      { mode_id: 1, display_name: 'Fitness', icon_emoji: '💪', is_active: true },
      { mode_id: 2, display_name: 'Hydration', icon_emoji: '💧', is_active: true },
    ]); // user's active modes

    const ctx = createCallbackCtx('mode_summary', 123);
    await handleModeSummary(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const text = ctx.reply.mock.calls[0][0] as string;

    expect(text).toContain('Mode Summary');
    expect(text).toContain('2');
    expect(text).toContain('Fitness');
    expect(text).toContain('Hydration');
  });

  it('should handle getUserByTelegramId failure', async () => {
    // queryOne returns null
    mockQueryOne.mockResolvedValueOnce(null);

    const ctx = createCallbackCtx('mode_summary', 123);
    await handleModeSummary(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading summary.');
  });

  it('should handle getModeSummary failure', async () => {
    // getUserByTelegramId → user found
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // getModeSummary query throws
    mockQuery.mockRejectedValueOnce(new Error('query failed'));

    const ctx = createCallbackCtx('mode_summary', 123);
    await handleModeSummary(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading mode summary.');
  });
});
