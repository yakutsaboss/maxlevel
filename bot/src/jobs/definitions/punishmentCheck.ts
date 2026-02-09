/**
 * Punishment Check Job
 * Runs daily at 00:30 UTC (after dailyQuestReset at midnight).
 * Finds quests that expired yesterday and were not completed,
 * marks them as failed, and applies XP penalties to users
 * who have opted into the accountability system.
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { invalidateUserCache } from '../../utils/cache.js';

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'punishment-check';
export const CRON_SCHEDULE = '30 0 * * *';

const BATCH_SIZE = 50;
const DELAY_BETWEEN_SENDS_MS = 200;

/** Intensity level → XP multiplier */
const INTENSITY_MULTIPLIER: Record<string, number> = {
  low: 0.5,
  medium: 1.0,
  high: 1.5,
  extreme: 2.0,
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  // Step 1: Find quests that expired yesterday and were not completed
  const failedQuests = await query(
    `SELECT qi.id AS quest_instance_id, qi.user_id, u.telegram_id,
            q.title, q.xp_reward
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     JOIN users u ON qi.user_id = u.id
     WHERE qi.status IN ('pending', 'ready', 'in_progress')
       AND qi.instance_date < CURRENT_DATE
       AND qi.instance_date >= CURRENT_DATE - INTERVAL '1 day'
       AND u.is_active = true`,
    []
  );

  if (!failedQuests || failedQuests.length === 0) {
    const elapsed = Date.now() - startTime;
    console.log(`[JOB:${JOB_NAME}] Completed in ${elapsed}ms — no expired quests found`);
    return;
  }

  // Step 2: Mark these quests as failed
  const failedIds = failedQuests.map((q: any) => q.quest_instance_id);
  await execute(
    `UPDATE quest_instances SET status = 'failed' WHERE id = ANY($1)`,
    [failedIds]
  );
  console.log(`[JOB:${JOB_NAME}] Marked ${failedIds.length} quests as failed`);

  // Step 3: Group by user for punishment processing
  const userQuests = new Map<number, Array<{ quest_instance_id: number; telegram_id: string; title: string; xp_reward: number }>>();
  for (const fq of failedQuests) {
    if (!userQuests.has(fq.user_id)) {
      userQuests.set(fq.user_id, []);
    }
    userQuests.get(fq.user_id)!.push({
      quest_instance_id: fq.quest_instance_id,
      telegram_id: fq.telegram_id,
      title: fq.title,
      xp_reward: fq.xp_reward,
    });
  }

  let punishmentsApplied = 0;
  let totalXpDeducted = 0;
  let notificationsSent = 0;
  let notificationsFailed = 0;

  // Step 4: Process each user
  const userIds = Array.from(userQuests.keys());

  for (let batchStart = 0; batchStart < userIds.length; batchStart += BATCH_SIZE) {
    const batch = userIds.slice(batchStart, batchStart + BATCH_SIZE);

    for (const userId of batch) {
      const quests = userQuests.get(userId)!;
      const telegramId = quests[0].telegram_id;

      // Check if user has punishment consent
      const settings = await queryOne(
        `SELECT consent_given, intensity_level, safe_mode, max_xp_penalty
         FROM punishment_settings WHERE user_id = $1`,
        [userId]
      );

      if (!settings || !settings.consent_given) {
        // No consent — just notify about failed quests (no penalty)
        if (botRef) {
          const titles = quests.map(q => q.title).join(', ');
          try {
            await botRef.api.sendMessage(
              telegramId,
              `⚠️ Quest${quests.length > 1 ? 's' : ''} expired: ${titles}\nNo penalty applied (accountability off).`
            );
            notificationsSent++;
          } catch {
            notificationsFailed++;
          }
          await sleep(DELAY_BETWEEN_SENDS_MS);
        }
        continue;
      }

      // Calculate today's already-deducted XP (for safe mode cap)
      let dailyDeducted = 0;
      if (settings.safe_mode) {
        const todayPenalties = await queryOne(
          `SELECT COALESCE(SUM(xp_deducted), 0)::int AS total
           FROM punishment_history
           WHERE user_id = $1 AND applied_at >= CURRENT_DATE`,
          [userId]
        );
        dailyDeducted = todayPenalties?.total ?? 0;
      }

      const multiplier = INTENSITY_MULTIPLIER[settings.intensity_level] ?? 1.0;
      const maxDaily = settings.max_xp_penalty;
      let userXpDeducted = 0;
      const penaltyMessages: string[] = [];

      for (const quest of quests) {
        let xpPenalty = Math.round(quest.xp_reward * multiplier);

        // Cap to max_xp_penalty per quest
        xpPenalty = Math.min(xpPenalty, maxDaily);

        // Safe mode: cap daily total
        if (settings.safe_mode) {
          const remaining = Math.max(0, maxDaily - dailyDeducted - userXpDeducted);
          xpPenalty = Math.min(xpPenalty, remaining);
        }

        if (xpPenalty <= 0) {
          // Daily cap reached
          penaltyMessages.push(`📋 ${quest.title} — failed (daily cap reached, no additional penalty)`);
          continue;
        }

        // Deduct XP
        await execute(
          `UPDATE users SET total_xp = GREATEST(0, total_xp - $1) WHERE id = $2`,
          [xpPenalty, userId]
        );

        // Record in punishment history
        await execute(
          `INSERT INTO punishment_history (user_id, quest_instance_id, punishment_type, severity, xp_deducted, message_sent, applied_at)
           VALUES ($1, $2, 'xp_penalty', $3, $4, $5, NOW())`,
          [userId, quest.quest_instance_id, settings.intensity_level, xpPenalty, `Failed quest: ${quest.title}. -${xpPenalty} XP`]
        );

        userXpDeducted += xpPenalty;
        punishmentsApplied++;
        penaltyMessages.push(`📋 ${quest.title} — -${xpPenalty} XP`);
      }

      totalXpDeducted += userXpDeducted;
      invalidateUserCache(userId);

      // Send Telegram notification
      if (botRef && penaltyMessages.length > 0) {
        const header = userXpDeducted > 0
          ? `⚡ Accountability Report\n\nYou missed ${quests.length} quest${quests.length > 1 ? 's' : ''} yesterday. Total penalty: -${userXpDeducted} XP\n`
          : `⚠️ You missed ${quests.length} quest${quests.length > 1 ? 's' : ''} yesterday.\n`;
        const message = header + '\n' + penaltyMessages.join('\n');

        try {
          await botRef.api.sendMessage(telegramId, message);
          notificationsSent++;
        } catch (err: any) {
          notificationsFailed++;
          console.warn(`[JOB:${JOB_NAME}] Failed to notify user ${telegramId}: ${err?.message || err}`);
        }
        await sleep(DELAY_BETWEEN_SENDS_MS);
      }
    }

    // Delay between batches
    if (batchStart + BATCH_SIZE < userIds.length) {
      await sleep(500);
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `quests failed: ${failedIds.length}, punishments applied: ${punishmentsApplied}, ` +
    `total XP deducted: ${totalXpDeducted}, ` +
    `notifications sent: ${notificationsSent}, notifications failed: ${notificationsFailed}`
  );
}
