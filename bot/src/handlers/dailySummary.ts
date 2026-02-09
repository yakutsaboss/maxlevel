/**
 * Daily Summary Notification Handler
 * Sends a motivational daily stats message to a user.
 * Called from a background job (pg-boss), NOT a command handler.
 */

import type { Bot, Context } from 'grammy';
import { queryOne } from '../utils/db.js';

/**
 * Send a daily summary notification to a user.
 * @param bot Grammy bot instance (only uses bot.api, so any context type works)
 * @param userId Internal user ID (users.id, not telegram_id)
 */
export async function sendDailySummary<C extends Context>(bot: Bot<C>, userId: number): Promise<boolean> {
  try {
    // Fetch user's telegram_id and daily stats in one query
    const stats = await queryOne(
      `SELECT
         u.telegram_id,
         u.first_name,
         u.current_level,
         u.total_xp,
         (SELECT COUNT(*)::int FROM quest_instances
          WHERE user_id = $1 AND status = 'completed'
          AND completed_at::date = CURRENT_DATE) AS quests_today,
         (SELECT COALESCE(SUM(xp_awarded), 0)::int FROM quest_instances
          WHERE user_id = $1 AND completed_at::date = CURRENT_DATE) AS xp_today,
         (SELECT COALESCE(MAX(current_streak), 0)::int FROM streaks
          WHERE user_id = $1) AS current_streak
       FROM users u
       WHERE u.id = $1`,
      [userId]
    );

    if (!stats || !stats.telegram_id) {
      console.warn(`[DailySummary] User ${userId} not found, skipping.`);
      return false;
    }

    const name = stats.first_name || 'Adventurer';
    const questsToday = stats.quests_today || 0;
    const xpToday = stats.xp_today || 0;
    const streak = stats.current_streak || 0;

    // Build motivational message
    let msg = `📊 *Daily Summary for ${name}*\n\n`;

    if (questsToday > 0) {
      msg += `✅ Quests completed today: *${questsToday}*\n`;
      msg += `⚡ XP earned today: *${xpToday}*\n`;
    } else {
      msg += `📭 No quests completed yet today.\n`;
    }

    if (streak > 0) {
      msg += `🔥 Current streak: *${streak} day${streak !== 1 ? 's' : ''}*\n`;
    }

    msg += `⭐ Level ${stats.current_level} · ${stats.total_xp} total XP\n\n`;

    // Motivational closing
    if (questsToday === 0) {
      msg += `💪 There's still time! Check /quests to find something to complete today.`;
    } else if (questsToday >= 3) {
      msg += `🎉 Amazing work today! You're on fire!`;
    } else {
      msg += `👍 Good progress! Keep the momentum going.`;
    }

    await bot.api.sendMessage(stats.telegram_id, msg, { parse_mode: 'Markdown' });
    return true;
  } catch (error) {
    console.error(`[DailySummary] Failed to send to user ${userId}:`, error);
    return false;
  }
}
