/**
 * Mini App Handler
 * Sends button to open the Telegram Mini App
 */

import { Context } from 'grammy';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://your-domain.com';

/**
 * Handle /app command - opens the Mini App
 */
export async function handleOpenApp(ctx: Context) {
  await ctx.reply(
    '🎮 *Welcome to RPG Quest!*\n\n' +
      'Open the Mini App to:\n' +
      '• 📊 View your stats and progress\n' +
      '• 🎯 Complete quests interactively\n' +
      '• 🏆 Track achievements\n' +
      '• 🔥 Monitor your streak\n\n' +
      '_Tap the button below to start!_',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Open RPG Quest',
              web_app: { url: MINI_APP_URL },
            },
          ],
        ],
      },
    }
  );
}

/**
 * Handle /quests command - opens Mini App to quests page
 */
export async function handleOpenQuests(ctx: Context) {
  await ctx.reply(
    '🎯 *Your Quests*\n\n' +
      'Open the Mini App to view and complete your active quests!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎯 View Quests',
              web_app: { url: `${MINI_APP_URL}/quests` },
            },
          ],
        ],
      },
    }
  );
}

/**
 * Handle /profile command - opens Mini App to profile page
 */
export async function handleOpenProfile(ctx: Context) {
  await ctx.reply(
    '👤 *Your Profile*\n\n' +
      'View your achievements, stats, and account info in the Mini App!',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '👤 View Profile',
              web_app: { url: `${MINI_APP_URL}/profile` },
            },
          ],
        ],
      },
    }
  );
}
