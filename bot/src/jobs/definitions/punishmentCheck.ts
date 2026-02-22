/**
 * Punishment Check Job
 * Runs daily at 00:30 UTC (after dailyQuestReset at midnight).
 * Finds quests that expired yesterday and were not completed,
 * marks them as failed, and applies XP + Stars penalties to users
 * who have opted into the accountability system.
 *
 * Stars deduction:
 *   - Uses STARS_PENALTY_RATES based on user's intensity_level.
 *   - Inserts 'warning' record first; actual 'stars_deduction' on next run.
 *   - Safe mode caps total Stars deduction per day.
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { invalidateUserCache } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';
import { STARS_PENALTY_RATES } from '../../api/utils/constants.js';

const log = logger.child({ component: 'punishmentCheck' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'punishment-check';
export const CRON_SCHEDULE = '30 0 * * *';

/** Row shape returned by the failed-quests query */
type FailedQuestRow = {
  quest_instance_id: number;
  user_id: number;
  telegram_id: string;
  title: string;
  xp_reward: number;
  level: number;
};

const BATCH_SIZE = 50;
const DELAY_BETWEEN_SENDS_MS = 200;

/** Intensity level → XP multiplier (rebalanced: ultra-light for beginners) */
const INTENSITY_MULTIPLIER: Record<string, number> = {
  low: 0.25,
  medium: 0.5,
  high: 1.0,
  extreme: 1.5,
};

/** Map DB intensity levels to STARS_PENALTY_RATES keys */
const INTENSITY_TO_STARS_KEY: Record<string, keyof typeof STARS_PENALTY_RATES> = {
  low: 'light',
  medium: 'moderate',
  high: 'strict',
  extreme: 'extreme',
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  log.info('Started');

  // Step 1: Find quests that expired yesterday and were not completed
  const failedQuests = await query<FailedQuestRow>(
    `SELECT qi.id AS quest_instance_id, qi.user_id, u.telegram_id,
            q.title, q.xp_reward, u.level
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
    log.info(`Completed in ${elapsed}ms — no expired quests found`);
    return;
  }

  // Step 2: Mark these quests as failed
  const failedIds = failedQuests.map(q => q.quest_instance_id);
  await execute(
    `UPDATE quest_instances SET status = 'failed' WHERE id = ANY($1)`,
    [failedIds]
  );
  log.info(`Marked ${failedIds.length} quests as failed`);

  // Step 3: Group by user for punishment processing
  const userQuests = new Map<number, Array<{ quest_instance_id: number; telegram_id: string; title: string; xp_reward: number; level: number }>>();
  for (const fq of failedQuests) {
    if (!userQuests.has(fq.user_id)) {
      userQuests.set(fq.user_id, []);
    }
    userQuests.get(fq.user_id)!.push({
      quest_instance_id: fq.quest_instance_id,
      telegram_id: fq.telegram_id,
      title: fq.title,
      xp_reward: fq.xp_reward,
      level: fq.level,
    });
  }

  let punishmentsApplied = 0;
  let totalXpDeducted = 0;
  let totalStarsDeducted = 0;
  let warningsSent = 0;
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
      const settings = await queryOne<{ consent_given: boolean; intensity_level: string; safe_mode: boolean; max_xp_penalty: number }>(
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
        const todayPenalties = await queryOne<{ total: number }>(
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

        // Level-based scaling: beginners get reduced penalties
        // Level 1 = 10% penalty, Level 5 = 50%, Level 10+ = full penalty
        const levelScale = Math.min(1.0, (quest.level || 1) / 10);
        xpPenalty = Math.round(xpPenalty * levelScale);

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

      // --- Stars deduction with pre-warning ---
      const starsKey = INTENSITY_TO_STARS_KEY[settings.intensity_level] ?? 'moderate';
      const starsPerQuest = STARS_PENALTY_RATES[starsKey];
      let starsToDeduct = starsPerQuest * quests.length;

      // Safe mode: cap Stars deduction using max_xp_penalty as combined cap
      if (settings.safe_mode) {
        starsToDeduct = Math.min(starsToDeduct, settings.max_xp_penalty);
      }

      // Check if a warning was already issued today for this user
      const existingWarning = await queryOne(
        `SELECT id FROM punishment_history
         WHERE user_id = $1 AND punishment_type = 'warning' AND applied_at >= CURRENT_DATE`,
        [userId]
      );

      if (!existingWarning) {
        // Issue warning — actual Stars deduction happens on next job run
        await execute(
          `INSERT INTO punishment_history (user_id, punishment_type, severity, xp_deducted, message_sent)
           VALUES ($1, 'warning', $2, 0, $3)`,
          [
            userId,
            settings.intensity_level,
            `Warning: ${quests.length} quest(s) missed. Stars deduction of ${starsToDeduct} pending.`,
          ]
        );
        warningsSent++;
        penaltyMessages.push(`⚠️ Stars penalty warning: -${starsToDeduct} ⭐ pending`);
      } else {
        // Warning already exists — check if Stars deduction already applied today
        const existingStarsDeduction = await queryOne(
          `SELECT id FROM punishment_history
           WHERE user_id = $1 AND punishment_type = 'stars_deduction' AND applied_at >= CURRENT_DATE`,
          [userId]
        );

        if (!existingStarsDeduction && starsToDeduct > 0) {
          await execute(
            `INSERT INTO punishment_history (user_id, punishment_type, severity, xp_deducted, message_sent)
             VALUES ($1, 'stars_deduction', $2, $3, $4)`,
            [
              userId,
              settings.intensity_level,
              starsToDeduct,
              `Stars deducted: ${starsToDeduct} (${quests.length} missed × ${starsPerQuest}/quest)`,
            ]
          );
          totalStarsDeducted += starsToDeduct;
          penaltyMessages.push(`⭐ -${starsToDeduct} Stars deducted`);
        }
      }

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
        } catch (err: unknown) {
          notificationsFailed++;
          log.warn(`Failed to notify user ${telegramId}: ${err instanceof Error ? err.message : String(err)}`);
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
  log.info(`Completed in ${elapsed}ms`, {
    questsFailed: failedIds.length, punishmentsApplied,
    totalXpDeducted, totalStarsDeducted, warningsSent,
    notificationsSent, notificationsFailed,
  });
}
