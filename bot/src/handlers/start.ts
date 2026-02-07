/**
 * /start Command Handler
 * Handles the initial interaction with the bot
 */

import { MyContext, getUserName, getTelegramId, sendMarkdownMessage } from '../bot.js';
import { createUser, getUserByTelegramId } from '../utils/pythonTools.js';
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
      // User exists - welcome back
      await sendMarkdownMessage(
        ctx,
        `👋 Welcome back, **${userName}**!\n\n` +
          `I'm your RPG Quest companion. I help you level up in real life by turning your goals into epic quests! 🎮\n\n` +
          `Current Status:\n` +
          `⭐ Level: ${existingUserResult.data.current_level}\n` +
          `💎 XP: ${existingUserResult.data.total_xp}\n\n` +
          `Ready to continue your journey? Use /menu to see available commands.`
      );

      // Store user ID in session
      ctx.session.userId = existingUserResult.data.id;
      ctx.session.telegramId = telegramId;
      ctx.session.username = username;
      ctx.session.firstName = userName;
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
