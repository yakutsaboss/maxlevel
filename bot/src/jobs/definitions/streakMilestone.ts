/**
 * Streak Milestone Notification Job
 * Sends congratulatory Telegram messages when users hit streak milestones.
 * Runs daily at 1 AM UTC — checks for users whose current_streak is exactly 7, 14, 30, 60, or 100.
 *
 * Features:
 * - Checks all modes (fitness, hydration, medication, etc.)
 * - DND-aware: skips users in Do Not Disturb window
 * - Telegram rate limit handling (429 → wait retry_after seconds)
 * - Batching: max 30 messages per second
 * - Logs to notification_log table
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { streakMilestoneTemplate } from '../../utils/notificationTemplates.js';

const log = logger.child({ component: 'streakMilestone' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'streak-milestones';
export const CRON_SCHEDULE = '0 1 * * *'; // Daily at 1 AM UTC

const BATCH_RATE = 30; // max messages per second (Telegram limit)
const MILESTONE_DAYS = [7, 14, 30, 60, 100];

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a given hour falls within a DND window.
 * Handles overnight windows (e.g. 22:00 - 08:00) correctly.
 */
function isInDndWindow(currentHour: number, dndStart: number, dndEnd: number): boolean {
  if (dndStart <= dndEnd) {
    return currentHour >= dndStart && currentHour < dndEnd;
  }
  return currentHour >= dndStart || currentHour < dndEnd;
}

async function sendWithRetry(
  bot: Bot<MyContext>,
  telegramId: number,
  text: string,
  keyboard: import('grammy').InlineKeyboard,
): Promise<boolean> {
  try {
    await bot.api.sendMessage(telegramId, text, {
      parse_mode: 'HTML',
      reply_markup: keyboard,
    });
    return true;
  } catch (err: unknown) {
    const tgErr = err as { error_code?: number; parameters?: { retry_after?: number } };
    if (tgErr.error_code === 429 || tgErr.parameters?.retry_after) {
      const retryAfter = tgErr.parameters?.retry_after ?? 5;
      log.warn(`Rate limited, waiting ${retryAfter}s before continuing`);
      await sleep(retryAfter * 1000);

      try {
        await bot.api.sendMessage(telegramId, text, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        });
        return true;
      } catch {
        // Fall through
      }
    }
    return false;
  }
}

export async function handler(_jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for streak milestones');

  const startTime = Date.now();
  log.info('Started');

  // Find users whose current_streak in any mode is exactly a milestone number.
  // Join with modes to get the mode display name.
  const milestoneUsers = await query<{
    telegram_id: number;
    user_id: number;
    first_name: string | null;
    current_streak: number;
    mode_display_name: string;
    local_hour: number;
    dnd_enabled: boolean;
    dnd_start: number;
    dnd_end: number;
  }>(`
    SELECT
      u.telegram_id,
      u.id AS user_id,
      u.first_name,
      s.current_streak,
      mo.display_name AS mode_display_name,
      EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::int AS local_hour,
      COALESCE(u.dnd_enabled, false) AS dnd_enabled,
      COALESCE(u.dnd_start, 22) AS dnd_start,
      COALESCE(u.dnd_end, 8) AS dnd_end
    FROM streaks s
    JOIN users u ON s.user_id = u.id
    JOIN modes mo ON s.mode_id = mo.id
    WHERE s.current_streak = ANY($1::int[])
      AND u.is_active = true
      AND u.notification_enabled = true
  `, [MILESTONE_DAYS]);

  if (milestoneUsers.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no streak milestones`);
    return;
  }

  let sent = 0;
  let failed = 0;
  let skippedDnd = 0;
  const failedUserIds: number[] = [];

  for (let i = 0; i < milestoneUsers.length; i++) {
    const user = milestoneUsers[i];

    // Skip users in DND window
    if (user.dnd_enabled && isInDndWindow(user.local_hour, user.dnd_start, user.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const { text, keyboard } = streakMilestoneTemplate({
      days: user.current_streak,
      mode: user.mode_display_name,
      first_name: user.first_name,
    });

    const ok = await sendWithRetry(botRef, user.telegram_id, text, keyboard);
    if (ok) {
      sent++;

      // Log to notification_log
      await query(`
        INSERT INTO notification_log (user_id, type, title, body)
        VALUES ($1, 'streak_milestone', $2, $3)
      `, [user.user_id, `${user.current_streak}-day ${user.mode_display_name} streak!`, text]);
    } else {
      failed++;
      failedUserIds.push(user.telegram_id);
      log.warn(`Failed to send streak milestone to user ${user.telegram_id}`);
    }

    // Rate limiting: pause every BATCH_RATE messages for 1 second
    if ((i + 1) % BATCH_RATE === 0 && i + 1 < milestoneUsers.length) {
      await sleep(1000);
    }
  }

  const elapsed = Date.now() - startTime;

  if (failedUserIds.length > 0) {
    log.warn('Failed telegram IDs', { failedUserIds });
  }

  log.info(`Completed in ${elapsed}ms`, { sent, failed, skippedDnd, total: milestoneUsers.length });
}
