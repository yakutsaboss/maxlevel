/**
 * Quest Reminders Job
 * Sends Telegram messages to users with incomplete quests at 6 PM UTC.
 *
 * Improvements:
 * - Telegram rate limit handling (429 → wait retry_after seconds)
 * - Batching: max 30 messages per second
 * - Logs failed sends with user ID
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'questReminders' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'quest-reminders';
export const CRON_SCHEDULE = '0 18 * * *';

const BATCH_RATE = 30; // max messages per second (Telegram limit)

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for quest reminders');

  const startTime = Date.now();
  log.info('Started');

  const usersWithQuests = await query(`
    SELECT DISTINCT u.telegram_id, u.first_name, COUNT(qi.id)::int AS pending_count
    FROM quest_instances qi
    JOIN users u ON qi.user_id = u.id
    WHERE qi.instance_date = CURRENT_DATE
      AND qi.status IN ('pending', 'ready', 'in_progress')
      AND u.is_active = true
    GROUP BY u.telegram_id, u.first_name
  `);

  if (usersWithQuests.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info(`Completed in ${elapsed}ms — no pending quests`);
    return;
  }

  let sent = 0;
  let failed = 0;
  const failedUserIds: number[] = [];

  for (let i = 0; i < usersWithQuests.length; i++) {
    const user = usersWithQuests[i];

    try {
      await botRef.api.sendMessage(
        user.telegram_id,
        `Hey ${user.first_name || 'there'}! You have ${user.pending_count} quest(s) still waiting today. Don't break your streak! 🔥`
      );
      sent++;
    } catch (err: unknown) {
      // Handle Telegram rate limit (HTTP 429)
      const tgErr = err as { error_code?: number; parameters?: { retry_after?: number }; message?: string };
      if (tgErr.error_code === 429 || tgErr.parameters?.retry_after) {
        const retryAfter = tgErr.parameters?.retry_after ?? 5;
        log.warn(`Rate limited, waiting ${retryAfter}s before continuing`);
        await sleep(retryAfter * 1000);

        // Retry this message once after waiting
        try {
          await botRef.api.sendMessage(
            user.telegram_id,
            `Hey ${user.first_name || 'there'}! You have ${user.pending_count} quest(s) still waiting today. Don't break your streak! 🔥`
          );
          sent++;
          continue;
        } catch (retryErr) {
          // Fall through to failure logging
        }
      }

      failed++;
      failedUserIds.push(user.telegram_id);
      log.warn(`Failed to send reminder to user ${user.telegram_id}: ${err instanceof Error ? err.message : String(err)}`);
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

  log.info(`Completed in ${elapsed}ms`, { sent, failed, total: usersWithQuests.length });
}