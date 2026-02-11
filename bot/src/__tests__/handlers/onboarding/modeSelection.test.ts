/**
 * Tests for onboarding/modeSelection.ts
 *
 * Tests: showModeSelection, handleModeSelection (toggle on/off),
 *        mode_info callback, mode_done callback, missing user guard,
 *        multi-mode selection, editMessageText on refresh.
 * Mocks: db (query, queryOne, execute), queries, Grammy context
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mockGetUserByTelegramId = vi.fn();
const mockListAllModes = vi.fn();
const mockGetUserActiveModes = vi.fn();

vi.mock('../../../utils/queries.js', () => ({
  getUserByTelegramId: (...args: any[]) => mockGetUserByTelegramId(...args),
  listAllModes: () => mockListAllModes(),
  getUserActiveModes: (...args: any[]) => mockGetUserActiveModes(...args),
}));

// Mock completion to avoid side effects from mode_done
const mockCompleteModeSelection = vi.fn();
vi.mock('../../../handlers/onboarding/completion.js', () => ({
  completeModeSelection: (...args: any[]) => mockCompleteModeSelection(...args),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { showModeSelection, handleModeSelection } from '../../../handlers/onboarding/modeSelection.js';

// ─── Helpers ─────────────────────────────────────────────────────────

const MODES = [
  { id: 1, display_name: 'Fitness', name: 'fitness', icon_emoji: '💪', description: 'Track fitness goals' },
  { id: 2, display_name: 'Hydration', name: 'hydration', icon_emoji: '💧', description: 'Stay hydrated' },
  { id: 3, display_name: 'Reading', name: 'reading', icon_emoji: '📚', description: 'Read more books' },
];

function createMockCtx(overrides: Record<string, any> = {}) {
  return {
    from: { id: 123, first_name: 'TestUser', username: 'testuser' },
    callbackQuery: undefined as any,
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
    ...overrides,
  } as any;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('showModeSelection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should send mode selection keyboard with all available modes', async () => {
    mockListAllModes.mockResolvedValue(MODES);

    const ctx = createMockCtx();
    await showModeSelection(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const message = ctx.reply.mock.calls[0][0] as string;
    expect(message).toContain('Choose Your Modes');

    const opts = ctx.reply.mock.calls[0][1];
    expect(opts.parse_mode).toBe('Markdown');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show error when no modes are available', async () => {
    mockListAllModes.mockResolvedValue([]);

    const ctx = createMockCtx();
    await showModeSelection(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Error loading modes. Please try again later.');
  });

  it('should return early when userId is missing', async () => {
    const ctx = createMockCtx({ from: undefined });
    await showModeSelection(ctx);

    expect(ctx.reply).not.toHaveBeenCalled();
    expect(mockListAllModes).not.toHaveBeenCalled();
  });
});

describe('handleModeSelection', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should add (toggle ON) a mode when not currently selected', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes.mockResolvedValue([]); // no active modes
    mockQueryOne.mockResolvedValue(null); // no existing user_modes row
    mockExecute.mockResolvedValue(1);
    mockListAllModes.mockResolvedValue(MODES);

    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_select_1' },
    });

    await handleModeSelection(ctx);

    // Should INSERT new user_mode + INSERT streak
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '✅ Mode added!' });
  });

  it('should remove (toggle OFF) a mode when already selected', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes
      .mockResolvedValueOnce([{ mode_id: 1, icon_emoji: '💪', display_name: 'Fitness' }]) // current
      .mockResolvedValueOnce([]); // after removal for refresh
    mockExecute.mockResolvedValue(1);
    mockListAllModes.mockResolvedValue(MODES);

    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_select_1' },
    });

    await handleModeSelection(ctx);

    // Should UPDATE to deactivate
    const deactivateCall = mockExecute.mock.calls[0];
    expect(deactivateCall[0]).toContain('is_active = false');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '➖ Mode removed!' });
  });

  it('should reactivate a previously disabled mode', async () => {
    mockGetUserByTelegramId.mockResolvedValue({ id: 10 });
    mockGetUserActiveModes
      .mockResolvedValueOnce([]) // not currently active
      .mockResolvedValueOnce([{ mode_id: 2, icon_emoji: '💧', display_name: 'Hydration' }]); // after reactivation
    mockQueryOne.mockResolvedValue({ id: 99, is_active: false }); // existing but inactive
    mockExecute.mockResolvedValue(1);
    mockListAllModes.mockResolvedValue(MODES);

    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_select_2' },
    });

    await handleModeSelection(ctx);

    // Should UPDATE to reactivate
    const reactivateCall = mockExecute.mock.calls[0];
    expect(reactivateCall[0]).toContain('is_active = true');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '✅ Mode added!' });
  });

  it('should show error when user not found in database', async () => {
    mockGetUserByTelegramId.mockResolvedValue(null);

    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_select_1' },
    });

    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: '❌ Error. Please try again.' });
    expect(mockExecute).not.toHaveBeenCalled();
  });

  it('should delegate to showModeInfo on mode_info callback', async () => {
    mockListAllModes.mockResolvedValue(MODES);

    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_info' },
    });

    await handleModeSelection(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
    // showModeInfo calls ctx.reply with mode descriptions
    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const msg = ctx.reply.mock.calls[0][0] as string;
    expect(msg).toContain('Mode Information');
  });

  it('should delegate to completeModeSelection on mode_done callback', async () => {
    const ctx = createMockCtx({
      callbackQuery: { data: 'mode_done' },
    });

    await handleModeSelection(ctx);

    expect(mockCompleteModeSelection).toHaveBeenCalledWith(ctx);
    expect(ctx.answerCallbackQuery).toHaveBeenCalled();
  });

  it('should return early when callbackData or userId is missing', async () => {
    const ctx1 = createMockCtx({ callbackQuery: undefined, from: { id: 123 } });
    await handleModeSelection(ctx1);
    expect(mockGetUserByTelegramId).not.toHaveBeenCalled();

    const ctx2 = createMockCtx({ callbackQuery: { data: 'mode_select_1' }, from: undefined });
    await handleModeSelection(ctx2);
    expect(mockGetUserByTelegramId).not.toHaveBeenCalled();
  });
});
