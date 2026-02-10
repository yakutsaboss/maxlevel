/**
 * /start Command Handler
 * Handles the initial interaction with the bot
 */

import { InlineKeyboard } from 'grammy';
import { MyContext, getUserName, getTelegramId, sendMarkdownMessage } from '../bot.js';
import { createUser, getUserByTelegramId } from '../utils/pythonTools.js';
import { query } from '../utils/db.js';
import { handleOnboarding } from './onboarding.js';

export async function handleStart(ctx: MyContext) {
  const telegramId = getTelegramId(ctx);
  if (!telegramId) {
    await ctx.reply('❌ Could not identify your Telegram account.');
    return;
  }

  const userName = getUserName(ctx);
  const username = ctx.from?.username;

  try {
    // Check if user exists
    const existingUserResult = await getUserByTelegramId(telegramId);

    if (existingUserResult.success && existingUserResult.data) {
      // User exists - welcome back with engagement
      const user = existingUserResult.data;

      // Store user ID in session
      ctx.session.userId = user.id;
      ctx.session.telegramId = telegramId;
      ctx.session.username = username;
      ctx.session.firstName = userName;

      // Get active quests count
      let questLine = '';
      try {
        const activeQuests = await query(
          `SELECT qi.id
           FROM quest_instances qi
           WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')`,
          [user.id]
        );
        const questCount = activeQuests.length;
        if (questCount > 0) {
          questLine = `\n🎯 ${questCount} active quest${questCount > 1 ? 's' : ''} waiting`;
        }
      } catch (err) {
        questLine = `\n⚠️ Couldn't load quests — try /quests later`;
        console.warn(`[/start] Failed to load quests for user ${user.id}:`, err);
      }

      const statusLine = `⭐ Level ${user.current_level} · 💎 ${user.total_xp} XP` + questLine;

      await sendMarkdownMessage(
        ctx,
        `👋 Welcome back, **${userName}**!\n\n` +
          `${statusLine}\n\n` +
          `What would you like to do?`
      );

      // Show quick action buttons
      const keyboard = new InlineKeyboard()
        .text('📋 View Quests', 'view_quests')
        .text('👤 My Profile', 'view_profile')
        .row()
        .text('🎮 Open Mini App', 'open_app')
        .row()
        .text('📋 Manage Modes', 'start_mode_selection');

      await ctx.reply('Choose an action:', { reply_markup: keyboard });
    } else {
      // New user - create account
      const createUserResult = await createUser(
        telegramId,
        username,
        userName,
        'UTC' // Default timezone, can be updated later
      );

      if (createUserResult.success && createUserResult.data) {
        // Store user ID in session
        ctx.session.userId = createUserResult.data.id;
        ctx.session.telegramId = telegramId;
        ctx.session.username = username;
        ctx.session.firstName = userName;

        // Start onboarding flow for new user
        await handleOnboarding(ctx);
      } else {
        // Specific error for account creation failure
        const reason = createUserResult.error || 'Unknown error';
        console.error(`[/start] Failed to create user ${telegramId}: ${reason}`);

        if (reason.includes('duplicate') || reason.includes('already exists')) {
          await ctx.reply(
            `⚠️ Your account already exists but couldn't be loaded.\n\n` +
            `Please try /start again. If this keeps happening, contact support.`
          );
        } else if (reason.includes('connection') || reason.includes('timeout')) {
          await ctx.reply(
            `⚠️ Database is temporarily unavailable.\n\n` +
            `Please try again in a few seconds.`
          );
        } else {
          await ctx.reply(
            `❌ Couldn't create your account: ${reason}\n\n` +
            `Please try again or contact support.`
          );
        }
      }
    }
  } catch (error: any) {
    console.error('[/start] Unhandled error:', error);

    // Provide specific error messages based on error type
    const msg = error.message || '';

    if (msg.includes('ECONNREFUSED') || msg.includes('connection')) {
      await ctx.reply(
        `⚠️ The bot's database is temporarily offline.\n\nPlease try again in a moment.`
      );
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
      await ctx.reply(
        `⏳ The request timed out. The server might be under heavy load.\n\nPlease try again.`
      );
    } else if (msg.includes('Python') || msg.includes('spawn')) {
      await ctx.reply(
        `⚠️ A backend service is currently unavailable.\n\nPlease try again shortly.`
      );
    } else {
      await ctx.reply(
        `❌ Something went wrong. Please try again.\n\nIf this keeps happening, contact support.`
      );
    }
  }
}
