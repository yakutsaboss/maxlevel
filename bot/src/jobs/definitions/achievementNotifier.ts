/**
 * Achievement Notifier Job
 * Checks for recently unlocked achievements and sends Telegram notifications.
 * Runs every 15 minutes; queries achievements unlocked in the last 2 hours
 * (overlapping window to avoid missed notifications between batch check runs).
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'achievementNotifier' });

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
  log.info('Started');

  const recentUnlocks = await query<{ user_id: number; telegram_id: number; achievement_id: number; name: string; badge_icon: string; xp_bonus: number }>(
    `SELECT ua.user_id, u.telegram_id, a.id AS achievement_id, a.name, a.badge_icon, a.xp_bonus
     FROM user_achievements ua
     JOIN users u ON u.id = ua.user_id
     JOIN achievements a ON a.id = ua.achievement_id
     WHERE ua.unlocked_at > NOW() - INTERVAL '2 hours'
       AND ua.notification_sent_at IS NULL
       AND u.is_active = true`,
    []
  );

  if (!recentUnlocks || recentUnlocks.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no recent achievement unlocks`);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (let i = 0; i < recentUnlocks.length; i++) {
    const unlock = recentUnlocks[i];
    const message = `🏆 Achievement Unlocked!\n\n${unlock.badge_icon} ${unlock.name}\n+${unlock.xp_bonus} XP bonus`;

    try {
      await botRef.api.sendMessage(unlock.telegram_id, message);
      await query(
        `UPDATE user_achievements SET notification_sent_at = NOW() WHERE user_id = $1 AND achievement_id = $2`,
        [unlock.user_id, unlock.achievement_id]
      );
      sent++;
    } catch (err: unknown) {
      const tgErr = err as { error_code?: number; parameters?: { retry_after?: number } };
      if (tgErr.error_code === 429 || tgErr.parameters?.retry_after) {
        const retryAfter = tgErr.parameters?.retry_after ?? 5;
        log.warn(`Rate limited, waiting ${retryAfter}s`);
        await sleep(retryAfter * 1000);

        try {
          await botRef.api.sendMessage(unlock.telegram_id, message);
          await query(
            `UPDATE user_achievements SET notification_sent_at = NOW() WHERE user_id = $1 AND achievement_id = $2`,
            [unlock.user_id, unlock.achievement_id]
          );
          sent++;
          continue;
        } catch {
          // Fall through to failure logging
        }
      }

      failed++;
      log.warn(`Failed to notify user ${unlock.telegram_id}: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Rate limiting: 200ms delay between sends
    if (i + 1 < recentUnlocks.length) {
      await sleep(DELAY_BETWEEN_SENDS_MS);
    }
  }

  const elapsed = Date.now() - startTime;
  log.info(`Completed in ${elapsed}ms`, { sent, failed, total: recentUnlocks.length });
}
