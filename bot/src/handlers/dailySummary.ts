/**
 * Daily Summary Notification Handler
 * Sends a motivational daily stats message to a user.
 * Called from a background job (pg-boss), NOT a command handler.
 */

import type { Bot, Context } from 'grammy';
import { queryOne } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { dailySummaryTemplate } from '../utils/notificationTemplates.js';

const log = logger.child({ component: 'dailySummary' });

/**
 * Send a daily summary notification to a user.
 * @param bot Grammy bot instance (only uses bot.api, so any context type works)
 * @param userId Internal user ID (users.id, not telegram_id)
 */
export async function sendDailySummary<C extends Context>(bot: Bot<C>, userId: number): Promise<boolean> {
  try {
    // Fetch user's telegram_id and daily stats in one query
    const stats = await queryOne<{ telegram_id: number; first_name: string | null; current_level: number; total_xp: number; quests_today: number; xp_today: number; current_streak: number }>(
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
      log.warn(`User ${userId} not found, skipping`);
      return false;
    }

    const { text, keyboard } = dailySummaryTemplate({
      first_name: stats.first_name,
      current_level: stats.current_level,
      total_xp: stats.total_xp,
      quests_today: stats.quests_today || 0,
      xp_today: stats.xp_today || 0,
      current_streak: stats.current_streak || 0,
    });

    await bot.api.sendMessage(stats.telegram_id, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return true;
  } catch (error) {
    log.error(`Failed to send to user ${userId}`, error as Error);
    return false;
  }
}
