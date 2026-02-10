/**
 * Tests for /settings bot command handler (bot/src/handlers/settings.ts)
 *
 * Tests: handleSettings (main menu), handleSettingsCallback (notification toggle,
 *        reminder time, timezone, back button)
 * Mocks: db (queryOne, execute), Grammy context
 */

import { describe, it, expect, vi } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: vi.fn(),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { handleSettings, handleSettingsCallback } from '../../handlers/settings.js';

// ─── Helpers ─────────────────────────────────────────────────────────

const TEST_USER = {
  id: 1,
  notification_enabled: true,
  timezone: 'Europe/Moscow',
  reminder_hour: 9,
};

function createMockCtx(telegramId?: number) {
  return {
    from: telegramId ? { id: telegramId } : undefined,
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

function createCallbackCtx(data: string, telegramId: number = 123456789) {
  return {
    from: { id: telegramId },
    callbackQuery: { data },
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

function mockUserFound(user: any = TEST_USER) {
  // getUserData → queryOne returns user row directly
  mockQueryOne.mockResolvedValueOnce(user);
}

function mockUserNotFound() {
  // getUserData → queryOne returns null
  mockQueryOne.mockResolvedValueOnce(null);
}

// ─── Tests: handleSettings ──────────────────────────────────────────

describe('handleSettings', () => {
  it('should show settings menu with notification status, reminder, timezone', async () => {
    mockUserFound();

    const ctx = createMockCtx(123456789);
    await handleSettings(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Settings');
    expect(text).toContain('Configure your preferences');
    expect(opts.parse_mode).toBe('Markdown');
    expect(opts.reply_markup).toBeDefined();
  });

  it('should show "On" when notifications are enabled', async () => {
    mockUserFound({ ...TEST_USER, notification_enabled: true });

    const ctx = createMockCtx(123456789);
    await handleSettings(ctx);

    const [, opts] = ctx.reply.mock.calls[0];
    // Inline keyboard should have "✅ On" in the notification button
    const keyboard = opts.reply_markup;
    expect(keyboard).toBeDefined();
  });

  it('should reply with error when user not found', async () => {
    mockUserNotFound();

    const ctx = createMockCtx(123456789);
    await handleSettings(ctx);

    expect(ctx.reply).toHaveBeenCalledWith('❌ Could not load your profile. Please /start first.');
  });

  it('should reply with error when ctx.from is missing', async () => {
    const ctx = createMockCtx(); // no telegramId
    await handleSettings(ctx);

    // getUserData returns null when no telegramId
    expect(ctx.reply).toHaveBeenCalledWith('❌ Could not load your profile. Please /start first.');
  });
});

// ─── Tests: handleSettingsCallback ──────────────────────────────────

describe('handleSettingsCallback', () => {
  it('should return early if callback data is missing', async () => {
    const ctx = {
      callbackQuery: { data: undefined },
      from: { id: 123 },
      reply: vi.fn(),
      editMessageText: vi.fn(),
      answerCallbackQuery: vi.fn(),
    } as any;

    await handleSettingsCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should return early if callback data does not start with settings:', async () => {
    const ctx = createCallbackCtx('other:data');
    await handleSettingsCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should show profile not found alert when user not found', async () => {
    mockUserNotFound();

    const ctx = createCallbackCtx('settings:notif');
    await handleSettingsCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: '❌ Profile not found',
      show_alert: true,
    });
  });

  // --- Notification toggle menu ---

  it('should show notification toggle sub-menu on settings:notif', async () => {
    mockUserFound();

    const ctx = createCallbackCtx('settings:notif');
    await handleSettingsCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('Notifications');
    expect(text).toContain('daily reminders');
    expect(opts.parse_mode).toBe('Markdown');
    expect(opts.reply_markup).toBeDefined();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  // --- Turn on/off notifications ---

  it('should enable notifications on settings:notif:on', async () => {
    mockUserFound();
    // execute UPDATE returns affected row count
    mockExecute.mockResolvedValueOnce(1);

    const ctx = createCallbackCtx('settings:notif:on');
    await handleSettingsCallback(ctx);

    // Verify execute was called to update notification_enabled
    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('notification_enabled'),
      expect.arrayContaining([true]),
    );

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: '🔔 Notifications enabled!',
    });
  });

  it('should disable notifications on settings:notif:off', async () => {
    mockUserFound();
    mockExecute.mockResolvedValueOnce(1);

    const ctx = createCallbackCtx('settings:notif:off');
    await handleSettingsCallback(ctx);

    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('notification_enabled'),
      expect.arrayContaining([false]),
    );

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: '🔕 Notifications disabled!',
    });
  });

  // --- Reminder time menu ---

  it('should show reminder time options on settings:reminder', async () => {
    mockUserFound();

    const ctx = createCallbackCtx('settings:reminder');
    await handleSettingsCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('Reminder Time');
    expect(opts.reply_markup).toBeDefined();
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should set reminder time on settings:reminder:12', async () => {
    mockUserFound();
    mockExecute.mockResolvedValueOnce(1);

    const ctx = createCallbackCtx('settings:reminder:12');
    await handleSettingsCallback(ctx);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('reminder_hour'),
      expect.arrayContaining([12]),
    );

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: expect.stringContaining('12:00 PM'),
    });
  });

  // --- Timezone menu ---

  it('should show timezone options on settings:tz', async () => {
    mockUserFound();

    const ctx = createCallbackCtx('settings:tz');
    await handleSettingsCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('Timezone');
    expect(text).toContain('Europe/Moscow');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should set timezone on settings:tz:America/New_York', async () => {
    mockUserFound();
    mockExecute.mockResolvedValueOnce(1);

    const ctx = createCallbackCtx('settings:tz:America/New_York');
    await handleSettingsCallback(ctx);

    expect(mockExecute).toHaveBeenCalledTimes(1);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('timezone'),
      expect.arrayContaining(['America/New_York']),
    );

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({
      text: expect.stringContaining('New York'),
    });
  });

  // --- Back button ---

  it('should go back to main settings on settings:back', async () => {
    mockUserFound();

    const ctx = createCallbackCtx('settings:back');
    await handleSettingsCallback(ctx);

    // showMainSettings calls editMessageText with Settings header
    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text] = ctx.editMessageText.mock.calls[0];
    expect(text).toContain('Settings');

    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });
});
