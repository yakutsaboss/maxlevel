/**
 * /stats Command Handler
 * Shows weekly/all-time user statistics with inline keyboard toggle.
 */

import { InlineKeyboard } from 'grammy';
import type { MyContext } from '../bot.js';
import { query, queryOne } from '../utils/db.js';

/** Weekly XP and quest counts (last 7 days). */
interface WeeklyStats {
  weekly_xp: number;
  quests_completed: number;
}

/** All-time user stats joined from users + quest_instances. */
interface AllTimeStats {
  total_xp: number;
  current_level: number;
  total_quests_completed: number;
  created_at?: string;
}

/** A streak row joined with its mode metadata. */
interface StreakRecord {
  current_streak: number;
  best_streak?: number;
  longest_streak?: number;
  mode_name: string;
  display_name: string;
  icon_emoji: string;
  mode_icon?: string;
}

const CB = {
  WEEK: 'stats:week',
  ALL: 'stats:all',
} as const;

async function getInternalUserId(telegramId: number): Promise<number | null> {
  const user = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  return user?.id ?? null;
}

async function getWeeklyStats(userId: number): Promise<WeeklyStats> {
  const rows = await query<WeeklyStats>(
    `SELECT
       COALESCE(SUM(qi.xp_earned), 0) AS weekly_xp,
       COUNT(CASE WHEN qi.status = 'completed' THEN 1 END) AS quests_completed
     FROM quest_instances qi
     WHERE qi.user_id = $1
       AND qi.instance_date >= CURRENT_DATE - INTERVAL '7 days'`,
    [userId]
  );
  return rows[0] || { weekly_xp: 0, quests_completed: 0 };
}

async function getAllTimeStats(userId: number): Promise<AllTimeStats> {
  const rows = await query<AllTimeStats>(
    `SELECT
       u.total_xp,
       u.current_level,
       COUNT(CASE WHEN qi.status = 'completed' THEN 1 END) AS total_quests_completed,
       u.created_at
     FROM users u
     LEFT JOIN quest_instances qi ON qi.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );
  return rows[0] || { total_xp: 0, current_level: 1, total_quests_completed: 0 };
}

async function getStreaks(userId: number): Promise<StreakRecord[]> {
  return query<StreakRecord>(
    `SELECT s.*, m.name AS mode_name, m.display_name, m.icon_emoji
     FROM streaks s
     JOIN modes m ON m.id = s.mode_id
     WHERE s.user_id = $1
     ORDER BY s.current_streak DESC`,
    [userId]
  );
}

function formatWeeklyMessage(
  firstName: string,
  weeklyStats: WeeklyStats,
  streaks: StreakRecord[]
): string {
  let msg = `📊 *${firstName}'s Weekly Stats*\n\n`;
  msg += `⚡ XP Earned: ${weeklyStats.weekly_xp || 0}\n`;
  msg += `✅ Quests Completed: ${weeklyStats.quests_completed || 0}\n\n`;

  if (streaks.length > 0) {
    msg += `🔥 *Current Streaks:*\n`;
    for (const s of streaks) {
      const icon = s.icon_emoji || s.mode_icon || '📌';
      const name = s.display_name || s.mode_name || 'Unknown';
      const current = s.current_streak ?? 0;
      msg += `${icon} ${name}: ${current} day${current !== 1 ? 's' : ''}\n`;
    }
  } else {
    msg += `🔥 No active streaks yet\n`;
  }

  return msg;
}

function formatAllTimeMessage(
  firstName: string,
  allTimeStats: AllTimeStats,
  streaks: StreakRecord[]
): string {
  let msg = `📊 *${firstName}'s All-Time Stats*\n\n`;
  msg += `⭐ Level: ${allTimeStats.current_level || 1}\n`;
  msg += `💎 Total XP: ${allTimeStats.total_xp || 0}\n`;
  msg += `✅ Quests Completed: ${allTimeStats.total_quests_completed || 0}\n\n`;

  if (streaks.length > 0) {
    msg += `🏆 *Best Streaks:*\n`;
    for (const s of streaks) {
      const icon = s.icon_emoji || s.mode_icon || '📌';
      const name = s.display_name || s.mode_name || 'Unknown';
      const best = s.best_streak ?? s.longest_streak ?? 0;
      msg += `${icon} ${name}: ${best} day${best !== 1 ? 's' : ''}\n`;
    }
  }

  if (allTimeStats.created_at) {
    const joined = new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    }).format(new Date(allTimeStats.created_at));
    msg += `\n📅 Joined: ${joined}`;
  }

  return msg;
}

function getKeyboard(active: 'week' | 'all'): InlineKeyboard {
  const weekLabel = active === 'week' ? '• This Week •' : 'This Week';
  const allLabel = active === 'all' ? '• All Time •' : 'All Time';
  return new InlineKeyboard()
    .text(weekLabel, CB.WEEK)
    .text(allLabel, CB.ALL);
}

/**
 * Handle /stats command — shows weekly stats by default.
 */
export async function handleStats(ctx: MyContext) {
  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'User';

  if (!telegramId) {
    await ctx.reply('❌ Could not identify your account.');
    return;
  }

  const userId = await getInternalUserId(telegramId);
  if (!userId) {
    await ctx.reply('❌ Profile not found. Please /start first.');
    return;
  }

  const [weeklyStats, streaks] = await Promise.all([
    getWeeklyStats(userId),
    getStreaks(userId),
  ]);

  await ctx.reply(formatWeeklyMessage(firstName, weeklyStats, streaks), {
    parse_mode: 'Markdown',
    reply_markup: getKeyboard('week'),
  });
}

/**
 * Handle stats callback queries (week/all toggle).
 */
export async function handleStatsCallback(ctx: MyContext) {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('stats:')) return;

  const telegramId = ctx.from?.id;
  const firstName = ctx.from?.first_name || 'User';

  if (!telegramId) {
    await ctx.answerCallbackQuery({ text: '❌ Error' });
    return;
  }

  const userId = await getInternalUserId(telegramId);
  if (!userId) {
    await ctx.answerCallbackQuery({ text: '❌ Profile not found' });
    return;
  }

  const streaks = await getStreaks(userId);

  let message: string;
  let active: 'week' | 'all';

  if (data === CB.WEEK) {
    const weeklyStats = await getWeeklyStats(userId);
    message = formatWeeklyMessage(firstName, weeklyStats, streaks);
    active = 'week';
  } else {
    const allTimeStats = await getAllTimeStats(userId);
    message = formatAllTimeMessage(firstName, allTimeStats, streaks);
    active = 'all';
  }

  try {
    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      reply_markup: getKeyboard(active),
    });
  } catch {
    // Message unchanged, ignore
  }

  await ctx.answerCallbackQuery();
}
