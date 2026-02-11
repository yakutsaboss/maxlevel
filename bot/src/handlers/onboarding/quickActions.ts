/**
 * Quick Actions - Post-onboarding quick action buttons (app, quests, profile)
 */

import { Context, InlineKeyboard } from 'grammy';
import { query, queryOne } from '../../utils/db.js';
import { getUserByTelegramId } from '../../utils/queries.js';

/**
 * Handle quick action buttons
 */
export async function handleQuickAction(ctx: Context) {
  const action = ctx.callbackQuery?.data;

  if (!action) return;

  await ctx.answerCallbackQuery();

  switch (action) {
    case 'open_app':
      // Import and call miniapp handler
      const miniAppUrl = process.env.MINI_APP_URL || 'https://your-miniapp-url.com';
      const keyboard = new InlineKeyboard().webApp('🎮 Open RPG Quest', miniAppUrl);

      await ctx.reply('Tap the button below to open the Mini App:', {
        reply_markup: keyboard,
      });
      break;

    case 'view_quests':
      await showQuickQuests(ctx);
      break;

    case 'view_profile':
      await showQuickProfile(ctx);
      break;
  }
}

/**
 * Show quick quests overview
 */
async function showQuickQuests(ctx: Context) {
  const userId = ctx.from?.id;

  if (!userId) return;

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading quests.');
    return;
  }

  const quests = await query(
    `SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, q.mode_id, m.name AS mode_name,
            m.icon_emoji AS mode_icon, qi.status, qi.instance_date,
            qi.check_in_count, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC`,
    [user.id]
  );

  if (quests.length === 0) {
    await ctx.reply('You have no active quests yet. Use /app to get started!');
    return;
  }

  let message = `📋 *Your Active Quests*\n\n`;

  quests.slice(0, 5).forEach((quest: any, index: number) => {
    const icon = quest.mode_icon || '📌';
    const status = quest.status === 'pending' ? '⏳' : quest.status === 'in_progress' ? '🔄' : '✅';

    message +=
      `${index + 1}. ${icon} *${quest.name}*\n` +
      `   ${status} ${quest.status} · ⚡ ${quest.xp_reward} XP\n\n`;
  });

  if (quests.length > 5) {
    message += `_...and ${quests.length - 5} more_\n\n`;
  }

  message += `Use /app to view all quests and track progress!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

/**
 * Show quick profile overview
 */
async function showQuickProfile(ctx: Context) {
  const userId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'User';

  if (!userId) return;

  const user = await getUserByTelegramId(userId);

  if (!user) {
    await ctx.reply('❌ Error loading profile.');
    return;
  }

  // Get streaks and quest count in parallel
  const [streaks, totalCompleted] = await Promise.all([
    query(
      `SELECT s.current_streak FROM streaks s WHERE s.user_id = $1`,
      [user.id]
    ),
    queryOne<Record<string, any>>(
      `SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status = 'completed'`,
      [user.id]
    ),
  ]);

  const level = user.current_level || 1;
  const xp = user.total_xp || 0;
  const overallStreak = streaks.length > 0
    ? Math.min(...streaks.map((s: any) => s.current_streak))
    : 0;
  const questsCompleted = totalCompleted?.total || 0;

  const message =
    `👤 *${firstName}'s Profile*\n\n` +
    `⭐ Level: ${level}\n` +
    `💎 Total XP: ${xp}\n` +
    `🔥 Streak: ${overallStreak} days\n` +
    `✅ Quests Completed: ${questsCompleted}\n\n` +
    `Use /app to see your full profile with achievements!`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
