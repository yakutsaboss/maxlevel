/**
 * /help Command Handler
 * Shows help with inline keyboard categories: Commands, How to Play, FAQ.
 */

import { InlineKeyboard } from 'grammy';
import type { Context } from 'grammy';
import { t } from '../i18n/index.js';

const CB = {
  COMMANDS: 'help:commands',
  HOW_TO_PLAY: 'help:howto',
  FAQ: 'help:faq',
} as const;

const MAIN_TEXT =
  '🤖 *Telegram RPG Quest Bot*\n\n' +
  'Turn your real-life goals into epic quests!\n\n' +
  'Choose a category below to learn more:';

const COMMANDS_TEXT =
  '📋 *Available Commands*\n\n' +
  '/start — Start or restart the bot\n' +
  '/app — Open the Mini App dashboard\n' +
  '/quests — View your active quests\n' +
  '/profile — View your profile\n' +
  '/modes — Manage your game modes\n' +
  '/settings — Configure notifications & timezone\n' +
  '/stats — View your statistics\n' +
  '/leaderboard — View top players\n' +
  '/menu — Show all commands\n' +
  '/help — This help menu\n' +
  '/ping — Check bot status';

const HOW_TO_PLAY_TEXT =
  '🎮 *How to Play*\n\n' +
  '*1. Create your account*\n' +
  'Use /start to register and set up your profile.\n\n' +
  '*2. Choose your modes*\n' +
  'Select game modes like Fitness, Hydration, etc. with /modes. Each mode gives you different types of quests.\n\n' +
  '*3. Complete quests*\n' +
  'Check your quests with /quests or the Mini App. Complete them to earn XP.\n\n' +
  '*4. Level up & streak*\n' +
  'Earn XP to level up. Complete quests daily to build streaks for bonus rewards.\n\n' +
  '*5. Unlock achievements*\n' +
  'Special milestones unlock achievement badges. Check /profile to see your progress.';

const FAQ_TEXT =
  '❓ *Frequently Asked Questions*\n\n' +
  '*Q: How do I earn XP?*\n' +
  'A: Complete quests! Each quest awards XP based on its difficulty.\n\n' +
  '*Q: What are modes?*\n' +
  'A: Modes are categories like Fitness or Hydration. Activating a mode unlocks quests related to it.\n\n' +
  '*Q: How do streaks work?*\n' +
  'A: Complete at least one quest per day to maintain your streak. Longer streaks earn bonus rewards.\n\n' +
  '*Q: Can I change my timezone?*\n' +
  'A: Yes! Use /settings to update your timezone and notification preferences.\n\n' +
  '*Q: How is the leaderboard ranked?*\n' +
  'A: By total XP earned. Check /leaderboard to see the top players.';

function getMainKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('📋 Commands', CB.COMMANDS)
    .text('🎮 How to Play', CB.HOW_TO_PLAY)
    .text('❓ FAQ', CB.FAQ);
}

function getBackKeyboard(activeCategory: string): InlineKeyboard {
  const kb = new InlineKeyboard();
  if (activeCategory !== CB.COMMANDS) kb.text('📋 Commands', CB.COMMANDS);
  if (activeCategory !== CB.HOW_TO_PLAY) kb.text('🎮 How to Play', CB.HOW_TO_PLAY);
  if (activeCategory !== CB.FAQ) kb.text('❓ FAQ', CB.FAQ);
  return kb;
}

/**
 * Handle /help command — shows main help with category buttons.
 */
export async function handleHelp(ctx: Context) {
  const lang = ctx.from?.language_code || 'en';
  const helpText = t(lang, 'help');

  await ctx.reply(helpText, {
    parse_mode: 'Markdown',
    reply_markup: getMainKeyboard(),
  });
}

/**
 * Handle help callback queries (category selection).
 */
export async function handleHelpCallback(ctx: Context) {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('help:')) return;

  let text: string;
  switch (data) {
    case CB.COMMANDS:
      text = COMMANDS_TEXT;
      break;
    case CB.HOW_TO_PLAY:
      text = HOW_TO_PLAY_TEXT;
      break;
    case CB.FAQ:
      text = FAQ_TEXT;
      break;
    default:
      await ctx.answerCallbackQuery({ text: 'Unknown category' });
      return;
  }

  try {
    await ctx.editMessageText(text, {
      parse_mode: 'Markdown',
      reply_markup: getBackKeyboard(data),
    });
  } catch {
    // Message unchanged, ignore
  }

  await ctx.answerCallbackQuery();
}
