/**
 * Medication Reminder Job
 * Sends Telegram reminders when it's time for a user's medication.
 * Runs every 15 minutes — checks if any medication's time_of_day is within ±7 min of now in user's timezone.
 *
 * Features:
 * - Timezone-aware: converts medication times to user's local time
 * - DND check: skips users in Do Not Disturb window
 * - Telegram rate limit handling (429 → wait retry_after seconds)
 * - Batching: max 30 messages per second
 * - Logs to notification_log table
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { medicationReminderTemplate } from '../../utils/notificationTemplates.js';

const log = logger.child({ component: 'medicationReminder' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'medication-reminders';
export const CRON_SCHEDULE = '*/15 * * * *'; // Every 15 minutes

const BATCH_RATE = 30; // max messages per second (Telegram limit)
const WINDOW_MINUTES = 7; // ±7 minutes window for matching medication times

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
  if (!botRef) throw new Error('Bot instance not set for medication reminders');

  const startTime = Date.now();
  log.info('Started');

  // Find medications where the scheduled time is within ±WINDOW_MINUTES of user's current local time.
  // We join medications with users and user_modes to ensure:
  // 1. User has medication mode active
  // 2. User has notifications enabled
  // 3. Medication is active
  // 4. A medication time_of_day entry is close to "now" in the user's timezone
  const dueMedications = await query<{
    telegram_id: number;
    user_id: number;
    medication_id: number;
    med_name: string;
    dosage: string | null;
    scheduled_time: string;
    local_hour: number;
    dnd_enabled: boolean;
    dnd_start: number;
    dnd_end: number;
  }>(`
    SELECT
      u.telegram_id,
      u.id AS user_id,
      m.id AS medication_id,
      m.name AS med_name,
      m.dosage,
      t.scheduled_time::text,
      EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::int AS local_hour,
      COALESCE(u.dnd_enabled, false) AS dnd_enabled,
      COALESCE(u.dnd_start, 22) AS dnd_start,
      COALESCE(u.dnd_end, 8) AS dnd_end
    FROM medications m
    JOIN users u ON m.user_id = u.id
    JOIN user_modes um ON um.user_id = u.id
    JOIN modes mo ON mo.id = um.mode_id AND mo.name = 'medication'
    CROSS JOIN LATERAL unnest(m.time_of_day) AS t(scheduled_time)
    LEFT JOIN medication_logs ml
      ON ml.medication_id = m.id
      AND ml.scheduled_date = CURRENT_DATE
      AND ml.scheduled_time = t.scheduled_time
    WHERE m.is_active = true
      AND u.is_active = true
      AND um.is_active = true
      AND u.notification_enabled = true
      AND ml.id IS NULL
      AND ABS(
        EXTRACT(EPOCH FROM (
          (NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::time
          - t.scheduled_time
        ))
      ) <= $1 * 60
  `, [WINDOW_MINUTES]);

  if (dueMedications.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no medications due`);
    return;
  }

  let sent = 0;
  let failed = 0;
  let skippedDnd = 0;
  const failedUserIds: number[] = [];

  for (let i = 0; i < dueMedications.length; i++) {
    const med = dueMedications[i];

    // Skip users in DND window
    if (med.dnd_enabled && isInDndWindow(med.local_hour, med.dnd_start, med.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const { text, keyboard } = medicationReminderTemplate({
      med_name: med.med_name,
      dosage: med.dosage,
    });

    const ok = await sendWithRetry(botRef, med.telegram_id, text, keyboard);
    if (ok) {
      sent++;

      // Log to notification_log
      await query(`
        INSERT INTO notification_log (user_id, type, title, body)
        VALUES ($1, 'medication_reminder', $2, $3)
      `, [med.user_id, `Reminder: ${med.med_name}`, text]);
    } else {
      failed++;
      failedUserIds.push(med.telegram_id);
      log.warn(`Failed to send medication reminder to user ${med.telegram_id}`);
    }

    // Rate limiting: pause every BATCH_RATE messages for 1 second
    if ((i + 1) % BATCH_RATE === 0 && i + 1 < dueMedications.length) {
      await sleep(1000);
    }
  }

  const elapsed = Date.now() - startTime;

  if (failedUserIds.length > 0) {
    log.warn('Failed telegram IDs', { failedUserIds });
  }

  log.info(`Completed in ${elapsed}ms`, { sent, failed, skippedDnd, total: dueMedications.length });
}
