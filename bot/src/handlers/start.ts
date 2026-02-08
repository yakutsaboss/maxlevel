/**
 * /start Command Handler
 * Handles the initial interaction with the bot
 */

import { InlineKeyboard } from 'grammy';
import { MyContext, getUserName, getTelegramId, sendMarkdownMessage } from '../bot.js';
import { createUser, getUserByTelegramId, executePythonTool } from '../utils/pythonTools.js';
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
      const questsResult = await executePythonTool('quest_manager', [
        '--get-active',
        '--user-id',
        user.id.toString(),
      ]);
      const activeQuests = (questsResult.data as any)?.quests || [];
      const questCount = activeQuests.length;

      let statusLine = `⭐ Level ${user.current_level} · 💎 ${user.total_xp} XP`;
      if (questCount > 0) {
        statusLine += `\n🎯 ${questCount} active quest${questCount > 1 ? 's' : ''} waiting`;
      }

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
        throw new Error(
          createUserResult.error || 'Failed to create user account'
        );
      }
    }
  } catch (error: any) {
    console.error('Error in /start handler:', error);
    await ctx.reply(
      `❌ Error: ${error.message}\n\n` +
        `Please make sure the database is set up correctly and try again.`
    );
  }
}
