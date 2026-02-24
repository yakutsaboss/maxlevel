/**
 * Challenge Notifier Job
 * Sends Telegram notifications for challenge updates:
 * - Challenges ending within 24h
 * - New participants who joined since last check
 *
 * Runs every 6 hours.
 * Respects DND + notification_enabled.
 * Logs to notification_log table.
 * Telegram rate limit handling (429 → wait retry_after seconds).
 * Batching: max 30 messages per second.
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'challengeNotifier' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'challenge-notifier';
export const CRON_SCHEDULE = '0 */6 * * *'; // Every 6 hours

const BATCH_RATE = 30;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
): Promise<boolean> {
  try {
    await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML' });
    return true;
  } catch (err: unknown) {
    const tgErr = err as { error_code?: number; parameters?: { retry_after?: number } };
    if (tgErr.error_code === 429 || tgErr.parameters?.retry_after) {
      const retryAfter = tgErr.parameters?.retry_after ?? 5;
      log.warn(`Rate limited, waiting ${retryAfter}s before continuing`);
      await sleep(retryAfter * 1000);
      try {
        await bot.api.sendMessage(telegramId, text, { parse_mode: 'HTML' });
        return true;
      } catch {
        // Fall through
      }
    }
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for challenge notifier');

  const startTime = Date.now();
  log.info('Started');

  let sent = 0;
  let failed = 0;
  let skippedDnd = 0;
  let msgIndex = 0;

  // --- 1. Challenges ending within 24 hours ---
  const endingSoon = await query<{
    challenge_id: number; title: string; participant_count: number;
    end_date: string; user_id: number; telegram_id: number;
    notification_enabled: boolean;
    dnd_enabled: boolean; dnd_start: number; dnd_end: number; local_hour: number;
  }>(`
    SELECT c.id AS challenge_id, c.title,
           (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id)::int AS participant_count,
           c.end_date,
           cp.user_id, u.telegram_id,
           COALESCE(u.notification_enabled, true) AS notification_enabled,
           COALESCE(u.dnd_enabled, false) AS dnd_enabled,
           COALESCE(u.dnd_start, 22) AS dnd_start,
           COALESCE(u.dnd_end, 8) AS dnd_end,
           EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(u.timezone, 'UTC'))::int AS local_hour
    FROM challenges c
    JOIN challenge_participants cp ON cp.challenge_id = c.id
    JOIN users u ON u.id = cp.user_id
    WHERE c.status = 'active'
      AND c.end_date IS NOT NULL
      AND c.end_date > NOW()
      AND c.end_date <= NOW() + INTERVAL '24 hours'
      AND u.is_active = true
  `);

  for (const row of endingSoon) {
    if (!row.notification_enabled) continue;
    if (row.dnd_enabled && isInDndWindow(row.local_hour, row.dnd_start, row.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const endDate = new Date(row.end_date).toLocaleDateString();
    const text = `🏆 <b>Challenge Ending Soon!</b>\n\n` +
      `<b>${escapeHtml(row.title)}</b>\n` +
      `👥 ${row.participant_count} participants\n` +
      `⏰ Ends: ${endDate}\n\n` +
      `Don't miss your chance to complete it!`;

    const ok = await sendWithRetry(botRef, row.telegram_id, text);
    if (ok) {
      sent++;
      await query(
        `INSERT INTO notification_log (user_id, type, title, body) VALUES ($1, 'challenge_ending', $2, $3)`,
        [row.user_id, `Challenge ending: ${row.title}`, text]
      );
    } else {
      failed++;
      log.warn(`Failed to send ending-soon notification to user ${row.telegram_id}`);
    }

    msgIndex++;
    if (msgIndex % BATCH_RATE === 0) await sleep(1000);
  }

  // --- 2. New participants joined in last 6 hours ---
  const newJoins = await query<{
    challenge_id: number; title: string; participant_count: number;
    new_user_first_name: string;
    creator_user_id: number; creator_telegram_id: number;
    notification_enabled: boolean;
    dnd_enabled: boolean; dnd_start: number; dnd_end: number; local_hour: number;
  }>(`
    SELECT c.id AS challenge_id, c.title,
           (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id)::int AS participant_count,
           new_user.first_name AS new_user_first_name,
           c.creator_id AS creator_user_id, creator.telegram_id AS creator_telegram_id,
           COALESCE(creator.notification_enabled, true) AS notification_enabled,
           COALESCE(creator.dnd_enabled, false) AS dnd_enabled,
           COALESCE(creator.dnd_start, 22) AS dnd_start,
           COALESCE(creator.dnd_end, 8) AS dnd_end,
           EXTRACT(HOUR FROM NOW() AT TIME ZONE COALESCE(creator.timezone, 'UTC'))::int AS local_hour
    FROM challenge_participants cp
    JOIN challenges c ON c.id = cp.challenge_id
    JOIN users new_user ON new_user.id = cp.user_id
    JOIN users creator ON creator.id = c.creator_id
    WHERE c.status = 'active'
      AND cp.joined_at > NOW() - INTERVAL '6 hours'
      AND cp.user_id != c.creator_id
      AND creator.is_active = true
  `);

  for (const row of newJoins) {
    if (!row.notification_enabled) continue;
    if (row.dnd_enabled && isInDndWindow(row.local_hour, row.dnd_start, row.dnd_end)) {
      skippedDnd++;
      continue;
    }

    const text = `🏆 <b>New Challenger!</b>\n\n` +
      `<b>${escapeHtml(row.new_user_first_name)}</b> joined your challenge ` +
      `"<b>${escapeHtml(row.title)}</b>"\n` +
      `👥 Now ${row.participant_count} participants`;

    const ok = await sendWithRetry(botRef, row.creator_telegram_id, text);
    if (ok) {
      sent++;
      await query(
        `INSERT INTO notification_log (user_id, type, title, body) VALUES ($1, 'challenge_new_participant', $2, $3)`,
        [row.creator_user_id, `New participant in ${row.title}`, text]
      );
    } else {
      failed++;
      log.warn(`Failed to send new-join notification to creator ${row.creator_telegram_id}`);
    }

    msgIndex++;
    if (msgIndex % BATCH_RATE === 0) await sleep(1000);
  }

  const elapsed = Date.now() - startTime;
  log.info(`Completed in ${elapsed}ms`, {
    sent, failed, skippedDnd,
    endingSoonChecked: endingSoon.length,
    newJoinsChecked: newJoins.length,
  });
}
