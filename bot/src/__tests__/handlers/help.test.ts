/**
 * Tests for /help bot command handler (bot/src/handlers/help.ts)
 *
 * Tests: handleHelp (sends main menu), handleHelpCallback (category selection)
 * Mocks: Grammy context (ctx.reply, ctx.callbackQuery, ctx.answerCallbackQuery, ctx.editMessageText)
 */

import { describe, it, expect, vi } from 'vitest';

import { handleHelp, handleHelpCallback } from '../../handlers/help.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createHelpCtx() {
  return {
    reply: vi.fn(),
  } as any;
}

function createCallbackCtx(data: string) {
  return {
    callbackQuery: { data },
    reply: vi.fn(),
    editMessageText: vi.fn(),
    answerCallbackQuery: vi.fn(),
  } as any;
}

// ─── Tests: handleHelp ──────────────────────────────────────────────

describe('handleHelp', () => {
  it('should send main help text with inline keyboard', async () => {
    const ctx = createHelpCtx();
    await handleHelp(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Telegram RPG Quest Bot');
    expect(text).toContain('Choose a category');
    expect(opts.parse_mode).toBe('Markdown');
    // reply_markup should have an inline keyboard
    expect(opts.reply_markup).toBeDefined();
  });
});

// ─── Tests: handleHelpCallback ──────────────────────────────────────

describe('handleHelpCallback', () => {
  it('should show commands list for help:commands', async () => {
    const ctx = createCallbackCtx('help:commands');
    await handleHelpCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.editMessageText.mock.calls[0];

    expect(text).toContain('Available Commands');
    expect(text).toContain('/start');
    expect(text).toContain('/quests');
    expect(text).toContain('/profile');
    expect(text).toContain('/help');
    expect(opts.parse_mode).toBe('Markdown');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should show how to play for help:howto', async () => {
    const ctx = createCallbackCtx('help:howto');
    await handleHelpCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const text = ctx.editMessageText.mock.calls[0][0] as string;

    expect(text).toContain('How to Play');
    expect(text).toContain('Create your account');
    expect(text).toContain('Choose your modes');
    expect(text).toContain('Level up');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should show FAQ for help:faq', async () => {
    const ctx = createCallbackCtx('help:faq');
    await handleHelpCallback(ctx);

    expect(ctx.editMessageText).toHaveBeenCalledTimes(1);
    const text = ctx.editMessageText.mock.calls[0][0] as string;

    expect(text).toContain('Frequently Asked Questions');
    expect(text).toContain('How do I earn XP');
    expect(text).toContain('What are modes');
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });

  it('should answer with "Unknown category" for unrecognized callback data', async () => {
    const ctx = createCallbackCtx('help:nonexistent');
    await handleHelpCallback(ctx);

    expect(ctx.answerCallbackQuery).toHaveBeenCalledWith({ text: 'Unknown category' });
    expect(ctx.editMessageText).not.toHaveBeenCalled();
  });

  it('should return early if callbackQuery data is missing', async () => {
    const ctx = {
      callbackQuery: { data: undefined },
      reply: vi.fn(),
      editMessageText: vi.fn(),
      answerCallbackQuery: vi.fn(),
    } as any;

    await handleHelpCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should return early if callbackQuery data does not start with help:', async () => {
    const ctx = createCallbackCtx('other:data');
    await handleHelpCallback(ctx);

    expect(ctx.editMessageText).not.toHaveBeenCalled();
    expect(ctx.answerCallbackQuery).not.toHaveBeenCalled();
  });

  it('should handle editMessageText error gracefully (message unchanged)', async () => {
    const ctx = createCallbackCtx('help:commands');
    ctx.editMessageText.mockRejectedValueOnce(new Error('message is not modified'));

    await handleHelpCallback(ctx);

    // Should still call answerCallbackQuery even if editMessageText fails
    expect(ctx.answerCallbackQuery).toHaveBeenCalledTimes(1);
  });
});
