/**
 * Daily Summary Job
 * Sends daily stats summary to users who have notifications enabled.
 * Runs every hour — sends to users whose reminder_time matches the current hour
 * in their local timezone.
 *
 * - Each hour, queries users where the current hour in their timezone = reminder_time
 * - Skips users whose DND window is active (dnd_enabled + current hour in dnd_start..dnd_end)
 * - Batches 50 users at a time with 200ms delay between sends
 * - Uses sendDailySummary handler for message formatting
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { sendDailySummary } from '../../handlers/dailySummary.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'dailySummaryJob' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'daily-summary';
export const CRON_SCHEDULE = '0 * * * *'; // Every hour — sends to users whose reminder_time matches

const BATCH_SIZE = 50;
const DELAY_BETWEEN_SENDS_MS = 200;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if a given hour falls within a DND window.
 * Handles overnight windows (e.g. 22:00 - 08:00) correctly.
 */
function isInDndWindow(currentHour: number, dndStart: number, dndEnd: number): boolean {
  if (dndStart <= dndEnd) {
    // Same-day window, e.g. 08:00 - 17:00
    return currentHour >= dndStart && currentHour < dndEnd;
  }
  // Overnight window, e.g. 22:00 - 08:00
  return currentHour >= dndStart || currentHour < dndEnd;
}

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for daily summary');

  const startTime = Date.now();
  log.info('Started');

  // Timezone-aware query: convert current UTC time to user's timezone,
  // then compare with reminder_time. Also fetch DND settings to filter.
  const users = await query<{
    id: number; telegram_id: number;
    dnd_enabled: boolean; dnd_start: number; dnd_end: number;
    local_hour: number;
  }>(
    `SELECT id, telegram_id,
            COALESCE(dnd_enabled, false) AS dnd_enabled,
            COALESCE(dnd_start, 22) AS dnd_start,
            COALESCE(dnd_end, 8) AS dnd_end,
            EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))::int AS local_hour
     FROM users
     WHERE is_active = true
       AND notification_enabled = true
       AND reminder_time = EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(timezone, 'UTC'))::int
     ORDER BY id`,
    []
  );

  if (!users || users.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no users with notifications enabled`);
    return;
  }

  let sent = 0;
  let failed = 0;
  let skippedDnd = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

    // Skip users in DND window
    if (user.dnd_enabled && isInDndWindow(user.local_hour, user.dnd_start, user.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const success = await sendDailySummary(botRef, user.id);
    if (success) {
      sent++;
    } else {
      failed++;
    }

    // Rate limiting: 200ms delay between sends
    if (i + 1 < users.length) {
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }

    // Log progress every batch
    if ((i + 1) % BATCH_SIZE === 0) {
      log.info(`Progress: ${i + 1}/${users.length}`, { sent, failed, skippedDnd });
    }
  }

  const elapsed = Date.now() - startTime;
  log.info(`Completed in ${elapsed}ms`, { sent, failed, skippedDnd, total: users.length });
}
