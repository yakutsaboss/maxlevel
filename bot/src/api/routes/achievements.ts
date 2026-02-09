import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, transaction } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';

const router = Router();

/**
 * GET /api/achievements
 * Get all available achievements.
 * Cached for 5 minutes — achievements rarely change.
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const achievements = await cached('achievements:all', TTL.MEDIUM, async () => {
      const rows = await query(
        `SELECT id, name, description, badge_icon AS icon, xp_bonus AS xp_reward,
                rarity, criteria,
                COALESCE(criteria->>'mode', 'general') AS category
         FROM achievements
         ORDER BY rarity DESC, name ASC`
      );
      return rows;
    });

    res.json({
      achievements,
      count: achievements.length,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/achievements/categories
 * Returns distinct achievement categories (mode names + 'general').
 * Cached for 5 minutes.
 */
router.get('/categories', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const categories = await cached('achievements:categories', TTL.MEDIUM, async () => {
      const rows = await query(
        `SELECT DISTINCT COALESCE(criteria->>'mode', 'general') AS category
         FROM achievements
         ORDER BY category ASC`
      );
      return rows.map((r: any) => r.category);
    });

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching achievement categories:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch achievement categories' });
  }
});

/**
 * GET /api/users/:userId/achievements
 * Get user's unlocked achievements
 */
router.get('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const rows = await query(
      `SELECT ua.id, ua.achievement_id, a.name, a.description,
              a.badge_icon AS icon, a.xp_bonus AS xp_reward, a.rarity,
              ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    const totalCount = await cached('achievements:total_count', TTL.MEDIUM, async () => {
      const row = await queryOne(`SELECT COUNT(*)::int AS total FROM achievements`);
      return row?.total ?? 0;
    });

    const unlockedCount = rows.length;

    res.json({
      achievements: rows,
      unlocked: unlockedCount,
      total: totalCount,
      progress: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch user achievements' });
  }
});

/**
 * GET /api/users/:userId/achievements/available
 * Uses LEFT JOIN instead of NOT IN for better performance.
 */
router.get('/users/:userId/available', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const rows = await query(
      `SELECT a.id, a.name, a.description, a.badge_icon AS icon,
              a.xp_bonus AS xp_reward, a.rarity, a.criteria
       FROM achievements a
       LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
       WHERE ua.id IS NULL
       ORDER BY a.rarity DESC, a.name ASC`,
      [userId]
    );

    res.json({
      achievements: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('Error fetching available achievements:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch available achievements' });
  }
});

/**
 * POST /api/users/:userId/:achievementId/unlock
 * Uses INSERT ON CONFLICT to avoid separate check query + race conditions.
 */
router.post('/users/:userId/:achievementId/unlock', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievementId = parseInt(req.params.achievementId);

    const result = await transaction(async (client) => {
      const achResult = await client.query(
        `SELECT * FROM achievements WHERE id = $1`,
        [achievementId]
      );
      if (achResult.rows.length === 0) return { error: 'not_found' };
      const achievement = achResult.rows[0];

      const unlockResult = await client.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT (user_id, achievement_id) DO NOTHING
         RETURNING *`,
        [userId, achievementId]
      );

      if (unlockResult.rows.length === 0) {
        return { error: 'already_unlocked' };
      }

      await client.query(
        `UPDATE users SET total_xp = total_xp + $1,
                          current_level = ((total_xp + $1) / 500) + 1
         WHERE id = $2`,
        [achievement.xp_bonus, userId]
      );

      return { achievement, unlocked: unlockResult.rows[0] };
    });

    if (result.error === 'not_found') {
      return res.status(404).json({ error: 'Not Found', message: 'Achievement not found' });
    }
    if (result.error === 'already_unlocked') {
      return res.status(400).json({ error: 'Bad Request', message: 'Achievement already unlocked' });
    }

    res.json({
      message: 'Achievement unlocked successfully',
      achievement: result.achievement,
      xpEarned: result.achievement.xp_bonus,
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to unlock achievement' });
  }
});

/**
 * GET /api/users/:userId/achievements/recent
 */
router.get('/users/:userId/recent', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 50);

    const rows = await query(
      `SELECT ua.id, ua.achievement_id, a.name, a.description,
              a.badge_icon AS icon, a.xp_bonus AS xp_reward, a.rarity,
              ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    res.json({
      achievements: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch recent achievements' });
  }
});

/**
 * Check if a single achievement's criteria is met for a user.
 * Handles both generic and mode-specific criteria.
 */
async function checkCriteriaMet(userId: number, userRow: any, criteria: any): Promise<boolean> {
  if (!criteria || !criteria.type) return false;

  switch (criteria.type) {
    // Generic (cross-mode) criteria
    case 'level':
    case 'level_reached':
      return userRow.level >= (criteria.value ?? criteria.level ?? 0);

    case 'total_xp':
      return userRow.total_xp >= (criteria.value ?? criteria.amount ?? 0);

    case 'quest_count':
      return userRow.quests_completed >= (criteria.value ?? criteria.count ?? 0);

    case 'streak': {
      if (criteria.mode) {
        // Mode-specific streak: check streaks table filtered by mode
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
        // Count completed quests for a specific mode
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
        // Count max consecutive days with completed quests in a specific mode
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
      // Check if user rebuilt a streak to at least N days after it was broken
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
 * Filter available achievements to find those whose criteria are met.
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
 * POST /api/users/:userId/achievements/check
 * Batches all unlocks in a single transaction instead of N+1 loop.
 * Supports mode-aware criteria: quest_complete, streak, quest_complete_consecutive.
 */
router.post('/users/:userId/check', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

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
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    // Check mode-aware criteria asynchronously
    const qualifying = await filterQualifyingAchievements(userId, userRow, availableAchievements);

    if (qualifying.length === 0) {
      return res.json({ newAchievements: [], count: 0, message: 'No new achievements unlocked' });
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

    res.json({
      newAchievements,
      count: newAchievements.length,
      message: newAchievements.length > 0
        ? `Unlocked ${newAchievements.length} new achievement(s)!`
        : 'No new achievements unlocked',
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to check achievements' });
  }
});

export { router as achievementRouter };
