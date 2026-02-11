/**
 * Onboarding Setup - Entry point for new user onboarding flow
 */

import { Context } from 'grammy';
import { showModeSelection } from './modeSelection.js';

/**
 * Start onboarding process
 */
export async function handleOnboarding(ctx: Context) {
  const userId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'there';

  if (!userId) {
    await ctx.reply('Error: Unable to identify user.');
    return;
  }

  // Welcome message
  await ctx.reply(
    `🎮 *Welcome to your RPG Quest journey, ${firstName}!*\n\n` +
      `I'll help you turn your real-life goals into epic quests.\n\n` +
      `Let's start by setting up your account...`,
    { parse_mode: 'Markdown' }
  );

  // Small delay for better UX
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Show mode selection
  await showModeSelection(ctx);
}
