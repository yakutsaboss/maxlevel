/**
 * Activity → Quest Integration
 *
 * When a user logs an activity, checks if any of their active fitness quests
 * can be progressed. Matches activity category to quest mode (Cardio/Strength/
 * Flexibility → fitness) and auto-increments check_in_count. If the quest
 * target is reached, auto-completes the quest and awards XP.
 */

import { query, transaction } from './db.js';
import { awardXp, type AwardXpResult } from './xpAward.js';
import { checkAndUnlockAchievements } from './achievementEngine.js';
import { updateStreak } from './streak.js';
import { invalidateUserCache, invalidatePrefix } from './cache.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'activityQuestMatcher' });

/** Categories that map to the fitness mode */
const FITNESS_CATEGORIES = new Set([
  'Cardio',
  'Strength',
  'Flexibility',
  'Sports',
  'Outdoor',
  'Mind-Body',
]);

/** Minimal activity log shape needed for matching */
export interface ActivityLogInput {
  id: number;
  activity_type_id: number;
  category?: string;
  duration_min?: number | null;
}

/** Result of matching an activity to quests */
export interface QuestMatchResult {
  questsProgressed: number;
  questsCompleted: number;
  totalXpAwarded: number;
  leveledUp: boolean;
  newLevel: number | null;
}

/**
 * Match a logged activity to the user's active quests and auto-progress them.
 *
 * @param userId  - Internal user ID (users.id)
 * @param activityLog - The activity log that was just created/completed
 * @returns Summary of quest progress changes
 */
export async function matchActivityToQuests(
  userId: number,
  activityLog: ActivityLogInput,
): Promise<QuestMatchResult> {
  const result: QuestMatchResult = {
    questsProgressed: 0,
    questsCompleted: 0,
    totalXpAwarded: 0,
    leveledUp: false,
    newLevel: null,
  };

  try {
    // 1. Resolve the activity category if not provided
    let category = activityLog.category;
    if (!category) {
      const typeRow = await query<{ category: string }>(
        `SELECT category FROM activity_types WHERE id = $1`,
        [activityLog.activity_type_id],
      );
      category = typeRow[0]?.category;
    }

    if (!category || !FITNESS_CATEGORIES.has(category)) {
      log.debug('Activity category does not map to fitness mode', {
        userId,
        category,
        activityLogId: activityLog.id,
      });
      return result;
    }

    // 2. Find active fitness quest instances for today
    const activeQuests = await query<{
      instance_id: number;
      quest_id: number;
      status: string;
      check_in_count: number;
      target: number;
      xp_reward: number;
      mode_id: number;
      title: string;
    }>(
      `SELECT qi.id AS instance_id, qi.quest_id, qi.status,
              qi.check_in_count, qi.target, q.xp_reward,
              q.mode_id, q.title
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = $1
         AND m.name = 'fitness'
         AND qi.instance_date = CURRENT_DATE
         AND qi.status IN ('ready', 'in_progress')
       ORDER BY qi.check_in_count ASC`,
      [userId],
    );

    if (activeQuests.length === 0) {
      log.debug('No active fitness quests for today', { userId });
      return result;
    }

    log.info('Matching activity to quests', {
      userId,
      category,
      activeQuestCount: activeQuests.length,
    });

    // 3. Progress each matching quest
    for (const quest of activeQuests) {
      const newCount = quest.check_in_count + 1;
      const target = quest.target || 1;
      const isComplete = newCount >= target;

      if (isComplete) {
        // Auto-complete: use transaction for XP award
        const xpResult = await transaction(async (client) => {
          await client.query(
            `UPDATE quest_instances
             SET check_in_count = $1,
                 status = 'completed',
                 completed_at = NOW(),
                 xp_awarded = $2
             WHERE id = $3`,
            [newCount, quest.xp_reward, quest.instance_id],
          );
          return awardXp(client, userId, quest.xp_reward);
        });

        result.questsCompleted++;
        result.totalXpAwarded += quest.xp_reward;

        if (xpResult.leveledUp) {
          result.leveledUp = true;
          result.newLevel = xpResult.newLevel;
        }

        log.info('Quest auto-completed via activity', {
          userId,
          questInstanceId: quest.instance_id,
          questTitle: quest.title,
          xpAwarded: quest.xp_reward,
          leveledUp: xpResult.leveledUp,
        });

        // Invalidate caches
        invalidateUserCache(userId);
        invalidatePrefix(`analytics:mode:${userId}:`);
        invalidatePrefix(`analytics:modes:${userId}`);
        invalidatePrefix(`analytics:summary:${userId}`);

        // Update streak and check achievements (fire-and-forget)
        Promise.allSettled([
          updateStreak(userId, quest.mode_id),
          checkAndUnlockAchievements(userId),
        ]).catch((err) =>
          log.error('Post-activity quest completion side effects failed', err as Error),
        );
      } else {
        // Just increment progress
        await query(
          `UPDATE quest_instances
           SET check_in_count = $1,
               status = 'in_progress'
           WHERE id = $2`,
          [newCount, quest.instance_id],
        );

        log.info('Quest progressed via activity', {
          userId,
          questInstanceId: quest.instance_id,
          questTitle: quest.title,
          newCount,
          target,
        });

        invalidateUserCache(userId);
      }

      result.questsProgressed++;
    }
  } catch (err) {
    // Don't let quest matching errors break activity logging
    log.error('Failed to match activity to quests', err as Error, {
      userId,
      activityLogId: activityLog.id,
    });
  }

  return result;
}
