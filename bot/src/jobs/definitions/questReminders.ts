/**
 * Quest Reminders Job
 * Sends Telegram messages to users with incomplete quests.
 * Runs every hour — checks if user's local time is 18:00 (evening reminder).
 *
 * Improvements:
 * - Timezone-aware: uses user's timezone instead of fixed UTC
 * - DND check: skips users in Do Not Disturb window
 * - Telegram rate limit handling (429 → wait retry_after seconds)
 * - Batching: max 30 messages per second
 * - Logs failed sends with user ID
 * - Rich HTML templates with inline buttons (Run 73)
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { questReminderTemplate } from '../../utils/notificationTemplates.js';

const log = logger.child({ component: 'questReminders' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'quest-reminders';
export const CRON_SCHEDULE = '0 * * * *'; // Every hour — timezone-aware check

// Mode-specific reminder logic:
// - fitness: workout reminders based on scheduled days
// - hydration: water intake reminders at intervals
// - medication: medication schedule reminders, dosage tracking, refill alerts
// - habits: daily habit check-in reminders

const BATCH_RATE = 30; // max messages per second (Telegram limit)
const REMINDER_HOUR = 18; // Send quest reminders when it's 6 PM in user's timezone

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

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for quest reminders');

  const startTime = Date.now();
  log.info('Started');

  // Timezone-aware: find users where it's currently REMINDER_HOUR in their timezone
  const usersWithQuests = await query<{
    telegram_id: number; first_name: string | null; pending_count: number;
    dnd_enabled: boolean; dnd_start: number; dnd_end: number; local_hour: number;
  }>(`
    SELECT DISTINCT u.telegram_id, u.first_name, COUNT(qi.id)::int AS pending_count,
           COALESCE(u.dnd_enabled, false) AS dnd_enabled,
           COALESCE(u.dnd_start, 22) AS dnd_start,
           COALESCE(u.dnd_end, 8) AS dnd_end,
           EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::int AS local_hour
    FROM quest_instances qi
    JOIN users u ON qi.user_id = u.id
    WHERE qi.instance_date = CURRENT_DATE
      AND qi.status IN ('pending', 'ready', 'in_progress')
      AND u.is_active = true
      AND EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::int = ${REMINDER_HOUR}
    GROUP BY u.telegram_id, u.first_name, u.dnd_enabled, u.dnd_start, u.dnd_end, u.timezone
  `);

  if (usersWithQuests.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no pending quests`);
    return;
  }

  let sent = 0;
  let failed = 0;
  let skippedDnd = 0;
  const failedUserIds: number[] = [];

  for (let i = 0; i < usersWithQuests.length; i++) {
    const user = usersWithQuests[i];

    // Skip users in DND window
    if (user.dnd_enabled && isInDndWindow(user.local_hour, user.dnd_start, user.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const { text, keyboard } = questReminderTemplate({
      first_name: user.first_name,
      pending_count: user.pending_count,
    });

    const ok = await sendWithRetry(botRef, user.telegram_id, text, keyboard);
    if (ok) {
      sent++;
    } else {
      failed++;
      failedUserIds.push(user.telegram_id);
      log.warn(`Failed to send reminder to user ${user.telegram_id}`);
    }

    // Rate limiting: pause every BATCH_RATE messages for 1 second
    if ((i + 1) % BATCH_RATE === 0 && i + 1 < usersWithQuests.length) {
      await sleep(1000);
    }
  }

  const elapsed = Date.now() - startTime;

  if (failedUserIds.length > 0) {
    log.warn('Failed telegram IDs', { failedUserIds });
  }

  log.info(`Completed in ${elapsed}ms`, { sent, failed, skippedDnd, total: usersWithQuests.length });
}
