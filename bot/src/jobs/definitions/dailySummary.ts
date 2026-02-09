/**
 * Daily Summary Job
 * Sends daily stats summary to users who have notifications enabled.
 * Runs at 9 PM UTC (midnight MSK).
 *
 * - Queries users with notification_enabled = true
 * - Batches 50 users at a time with 200ms delay between sends
 * - Uses sendDailySummary handler for message formatting
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { sendDailySummary } from '../../handlers/dailySummary.js';

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'daily-summary';
export const CRON_SCHEDULE = '0 21 * * *'; // 9 PM UTC = midnight MSK

const BATCH_SIZE = 50;
const DELAY_BETWEEN_SENDS_MS = 200;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for daily summary');

  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  // Fetch all active users with notifications enabled
  const users = await query(
    `SELECT id, telegram_id FROM users
     WHERE is_active = true AND notification_enabled = true
     ORDER BY id`,
    []
  );

  if (!users || users.length === 0) {
    const elapsed = Date.now() - startTime;
    console.log(`[JOB:${JOB_NAME}] Completed in ${elapsed}ms — no users with notifications enabled`);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < users.length; i++) {
    const user = users[i];

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
      console.log(`[JOB:${JOB_NAME}] Progress: ${i + 1}/${users.length} (sent: ${sent}, failed: ${failed})`);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `sent: ${sent}, failed: ${failed}, total: ${users.length}`
  );
}
