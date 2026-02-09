/**
 * Achievement Notifier Job
 * Checks for recently unlocked achievements and sends Telegram notifications.
 * Runs every 15 minutes; queries achievements unlocked in the last 20 minutes
 * (overlapping window to avoid missed notifications).
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'achievement-notifier';
export const CRON_SCHEDULE = '*/15 * * * *';

const DELAY_BETWEEN_SENDS_MS = 200;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for achievement notifier');

  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  const recentUnlocks = await query(
    `SELECT ua.user_id, u.telegram_id, a.name, a.badge_icon, a.xp_bonus
     FROM user_achievements ua
     JOIN users u ON u.id = ua.user_id
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.unlocked_at > NOW() - INTERVAL '20 minutes'
       AND u.is_active = true`,
    []
  );

  if (!recentUnlocks || recentUnlocks.length === 0) {
    const elapsed = Date.now() - startTime;
    console.log(`[JOB:${JOB_NAME}] Completed in ${elapsed}ms — no recent achievement unlocks`);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recentUnlocks.length; i++) {
    const unlock = recentUnlocks[i];
    const message = `🏆 Achievement Unlocked!\n\n${unlock.badge_icon} ${unlock.name}\n+${unlock.xp_bonus} XP bonus`;

    try {
      await botRef.api.sendMessage(unlock.telegram_id, message);
      sent++;
    } catch (err: any) {
      if (err?.error_code === 429 || err?.parameters?.retry_after) {
        const retryAfter = err.parameters?.retry_after ?? 5;
        console.warn(`[JOB:${JOB_NAME}] Rate limited, waiting ${retryAfter}s`);
        await sleep(retryAfter * 1000);

        try {
          await botRef.api.sendMessage(unlock.telegram_id, message);
          sent++;
          continue;
        } catch {
          // Fall through to failure logging
        }
      }

      failed++;
      console.warn(`[JOB:${JOB_NAME}] Failed to notify user ${unlock.telegram_id}: ${err?.message || err}`);
    }

    // Rate limiting: 200ms delay between sends
    if (i + 1 < recentUnlocks.length) {
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `sent: ${sent}, failed: ${failed}, total: ${recentUnlocks.length}`
  );
}
