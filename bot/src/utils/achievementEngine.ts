/**
 * Achievement Engine Utility
 * Core logic for checking and unlocking achievements for a user.
 * Can be called from API routes, background jobs, or quest completion hooks
 * without HTTP overhead.
 */

import { query, queryOne, transaction } from './db.js';
import { invalidateUserCache } from './cache.js';

/**
 * Check if a single achievement criterion is met for a user.
 * Mirrors the logic from achievements.ts POST /check endpoint.
 */
async function checkCriteriaMet(userId: number, userRow: any, criteria: any): Promise<boolean> {
  if (!criteria || !criteria.type) return false;

  switch (criteria.type) {
    case 'level':
    case 'level_reached':
      return userRow.level >= (criteria.value ?? criteria.level ?? 0);

    case 'total_xp':
      return userRow.total_xp >= (criteria.value ?? criteria.amount ?? 0);

    case 'quest_count':
      return userRow.quests_completed >= (criteria.value ?? criteria.count ?? 0);

    case 'streak': {
      if (criteria.mode) {
        const row = await queryOne(
          `SELECT COALESCE(s.current_streak, 0)::int AS streak
           FROM streaks s
           JOIN modes m ON m.id = s.mode_id
           WHERE s.user_id = $1 AND m.name = $2`,
          [userId, criteria.mode]
        );
        return (row?.streak ?? 0) >= (criteria.days ?? criteria.value ?? 0);
      }
      return userRow.current_streak >= (criteria.days ?? criteria.value ?? 0);
    }

    case 'quest_complete': {
      if (criteria.mode) {
        const row = await queryOne(
          `SELECT COUNT(*)::int AS cnt
           FROM quest_instances qi
           JOIN quests q ON q.id = qi.quest_id
           JOIN modes m ON m.id = q.mode_id
           WHERE qi.user_id = $1 AND qi.status = 'completed' AND m.name = $2`,
          [userId, criteria.mode]
        );
        return (row?.cnt ?? 0) >= (criteria.count ?? 0);
      }
      return userRow.quests_completed >= (criteria.count ?? 0);
    }

    case 'quest_complete_consecutive': {
      if (criteria.mode) {
        const row = await queryOne(
          `WITH daily AS (
             SELECT DISTINCT qi.instance_date
             FROM quest_instances qi
             JOIN quests q ON q.id = qi.quest_id
             JOIN modes m ON m.id = q.mode_id
             WHERE qi.user_id = $1 AND qi.status = 'completed' AND m.name = $2
             ORDER BY qi.instance_date
           ),
           grouped AS (
             SELECT instance_date,
                    instance_date - (ROW_NUMBER() OVER (ORDER BY instance_date))::int AS grp
             FROM daily
           )
           SELECT MAX(cnt)::int AS max_consecutive
           FROM (SELECT COUNT(*) AS cnt FROM grouped GROUP BY grp) sub`,
          [userId, criteria.mode]
        );
        return (row?.max_consecutive ?? 0) >= (criteria.days ?? 0);
      }
      return false;
    }

    case 'multi_mode_active': {
      const row = await queryOne(
        `SELECT COUNT(DISTINCT mode_id)::int AS cnt
         FROM user_modes
         WHERE user_id = $1 AND is_active = true`,
        [userId]
      );
      return (row?.cnt ?? 0) >= (criteria.count ?? 0);
    }

    case 'streak_rebuild': {
      const row = await queryOne(
        `SELECT MAX(current_streak)::int AS best
         FROM streaks WHERE user_id = $1`,
        [userId]
      );
      return (row?.best ?? 0) >= (criteria.days ?? 0);
    }

    default:
      return false;
  }
}

/**
 * Filter achievements to find those whose criteria are met by the user.
 */
async function filterQualifyingAchievements(
  userId: number,
  userRow: any,
  achievements: any[]
): Promise<any[]> {
  const results = await Promise.all(
    achievements.map(async (a: any) => {
      const met = await checkCriteriaMet(userId, userRow, a.criteria);
      return met ? a : null;
    })
  );
  return results.filter(Boolean);
}

/**
 * Check and unlock all qualifying achievements for a user.
 * Returns an array of newly unlocked achievements (empty if none).
 */
export async function checkAndUnlockAchievements(userId: number): Promise<any[]> {
  const [userRow, availableAchievements] = await Promise.all([
    queryOne(
      `SELECT u.current_level AS level, u.total_xp,
              COALESCE(s.current_streak, 0)::int AS current_streak,
              COALESCE(qc.total, 0)::int AS quests_completed
       FROM users u
       LEFT JOIN LATERAL (
         SELECT MAX(current_streak) AS current_streak FROM streaks WHERE user_id = u.id
       ) s ON true
       LEFT JOIN LATERAL (
         SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = u.id AND status = 'completed'
       ) qc ON true
       WHERE u.id = $1`,
      [userId]
    ),
    query(
      `SELECT a.*
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       WHERE ua.id IS NULL`,
      [userId]
    ),
  ]);

  if (!userRow) {
    return [];
  }

  const qualifying = await filterQualifyingAchievements(userId, userRow, availableAchievements);

  if (qualifying.length === 0) {
    return [];
  }

  const newAchievements = await transaction(async (client) => {
    const unlocked = [];
    let totalXp = 0;

    for (const achievement of qualifying) {
      const result = await client.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING id`,
        [userId, achievement.id]
      );
      if (result.rows.length > 0) {
        unlocked.push(achievement);
        totalXp += achievement.xp_bonus || 0;
      }
    }

    if (totalXp > 0) {
      await client.query(
        `UPDATE users SET total_xp = total_xp + $1,
                          current_level = ((total_xp + $1) / 500) + 1
         WHERE id = $2`,
        [totalXp, userId]
      );
    }

    return unlocked;
  });

  if (newAchievements.length > 0) {
    invalidateUserCache(userId);
  }

  return newAchievements;
}
