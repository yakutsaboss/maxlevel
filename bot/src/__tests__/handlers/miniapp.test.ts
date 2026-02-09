/**
 * Tests for miniapp bot command handlers (bot/src/handlers/miniapp.ts)
 *
 * Tests: handleOpenApp, handleOpenQuests, handleOpenProfile
 * Mocks: Grammy context (ctx.reply), process.env.MINI_APP_URL
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { handleOpenApp, handleOpenQuests, handleOpenProfile } from '../../handlers/miniapp.js';

// ─── Helpers ─────────────────────────────────────────────────────────

function createCtx() {
  return {
    reply: vi.fn(),
  } as any;
}

// ─── Tests: handleOpenApp ────────────────────────────────────────────

describe('handleOpenApp', () => {
  it('should send welcome text with Markdown parse_mode', async () => {
    const ctx = createCtx();
    await handleOpenApp(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Welcome to RPG Quest');
    expect(opts.parse_mode).toBe('Markdown');
  });

  it('should include inline keyboard with web_app URL', async () => {
    const ctx = createCtx();
    await handleOpenApp(ctx);

    const opts = ctx.reply.mock.calls[0][1];
    expect(opts.reply_markup).toBeDefined();
    expect(opts.reply_markup.inline_keyboard).toBeDefined();
    expect(opts.reply_markup.inline_keyboard).toHaveLength(1);

    const button = opts.reply_markup.inline_keyboard[0][0];
    expect(button.text).toContain('Open RPG Quest');
    expect(button.web_app).toBeDefined();
    expect(button.web_app.url).toBeDefined();
  });

  it('should mention key features in the text', async () => {
    const ctx = createCtx();
    await handleOpenApp(ctx);

    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('stats');
    expect(text).toContain('quests');
    expect(text).toContain('achievements');
    expect(text).toContain('streak');
  });
});

// ─── Tests: handleOpenQuests ─────────────────────────────────────────

describe('handleOpenQuests', () => {
  it('should send quests text with Markdown parse_mode', async () => {
    const ctx = createCtx();
    await handleOpenQuests(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Your Quests');
    expect(opts.parse_mode).toBe('Markdown');
  });

  it('should include inline keyboard with /quests web_app URL', async () => {
    const ctx = createCtx();
    await handleOpenQuests(ctx);

    const opts = ctx.reply.mock.calls[0][1];
    const button = opts.reply_markup.inline_keyboard[0][0];

    expect(button.text).toContain('View Quests');
    expect(button.web_app.url).toContain('/quests');
  });
});

// ─── Tests: handleOpenProfile ────────────────────────────────────────

describe('handleOpenProfile', () => {
  it('should send profile text with Markdown parse_mode', async () => {
    const ctx = createCtx();
    await handleOpenProfile(ctx);

    expect(ctx.reply).toHaveBeenCalledTimes(1);
    const [text, opts] = ctx.reply.mock.calls[0];

    expect(text).toContain('Your Profile');
    expect(opts.parse_mode).toBe('Markdown');
  });

  it('should include inline keyboard with /profile web_app URL', async () => {
    const ctx = createCtx();
    await handleOpenProfile(ctx);

    const opts = ctx.reply.mock.calls[0][1];
    const button = opts.reply_markup.inline_keyboard[0][0];

    expect(button.text).toContain('View Profile');
    expect(button.web_app.url).toContain('/profile');
  });

  it('should mention achievements and stats in the text', async () => {
    const ctx = createCtx();
    await handleOpenProfile(ctx);

    const text = ctx.reply.mock.calls[0][0] as string;
    expect(text).toContain('achievements');
    expect(text).toContain('stats');
  });
});
