import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { executePythonTool, executeSafeQuery } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/achievements
 * Get all available achievements
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const result = await executeSafeQuery(
      `SELECT
        id,
        name,
        description,
        icon,
        xp_reward,
        rarity,
        category,
        criteria_type,
        criteria_value,
        is_active
      FROM achievements
      WHERE is_active = true
      ORDER BY rarity DESC, name ASC`
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch achievements',
      });
    }

    res.json({
      achievements: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch achievements',
    });
  }
});

/**
 * GET /api/users/:userId/achievements
 * Get user's unlocked achievements
 */
router.get('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await executeSafeQuery(
      `SELECT
        ua.id,
        ua.achievement_id,
        a.name,
        a.description,
        a.icon,
        a.xp_reward,
        a.rarity,
        a.category,
        ua.unlocked_at,
        ua.progress
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = %s
      ORDER BY ua.unlocked_at DESC`,
      [userId]
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch user achievements',
      });
    }

    // Get total achievement count
    const totalResult = await executeSafeQuery(
      `SELECT COUNT(*) as total FROM achievements WHERE is_active = true`
    );

    const unlockedCount = result.data?.length || 0;
    const totalCount = totalResult.success ? totalResult.data[0]?.total || 0 : 0;

    res.json({
      achievements: result.data || [],
      unlocked: unlockedCount,
      total: totalCount,
      progress: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
    });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user achievements',
    });
  }
});

/**
 * GET /api/users/:userId/achievements/available
 * Get achievements the user hasn't unlocked yet
 */
router.get('/users/:userId/available', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await executeSafeQuery(
      `SELECT
        a.id,
        a.name,
        a.description,
        a.icon,
        a.xp_reward,
        a.rarity,
        a.category,
        a.criteria_type,
        a.criteria_value
      FROM achievements a
      WHERE a.is_active = true
      AND a.id NOT IN (
        SELECT achievement_id
        FROM user_achievements
        WHERE user_id = %s
      )
      ORDER BY a.rarity DESC, a.name ASC`,
      [userId]
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch available achievements',
      });
    }

    res.json({
      achievements: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching available achievements:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch available achievements',
    });
  }
});

/**
 * POST /api/users/:userId/achievements/:achievementId/unlock
 * Unlock an achievement for a user
 */
router.post('/users/:userId/:achievementId/unlock', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const achievementId = parseInt(req.params.achievementId);

    // Check if already unlocked
    const checkResult = await executeSafeQuery(
      `SELECT id FROM user_achievements
       WHERE user_id = %s AND achievement_id = %s`,
      [userId, achievementId]
    );

    if (checkResult.success && checkResult.data && checkResult.data.length > 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Achievement already unlocked',
      });
    }

    // Get achievement details
    const achievementResult = await executeSafeQuery(
      `SELECT * FROM achievements WHERE id = %s AND is_active = true`,
      [achievementId]
    );

    if (!achievementResult.success || !achievementResult.data || achievementResult.data.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Achievement not found',
      });
    }

    const achievement = achievementResult.data[0];

    // Unlock achievement
    const unlockResult = await executeSafeQuery(
      `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress)
       VALUES (%s, %s, NOW(), 100)
       RETURNING *`,
      [userId, achievementId]
    );

    if (!unlockResult.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to unlock achievement',
      });
    }

    // Award XP
    const xpResult = await executePythonTool('user_manager', [
      '--add-xp',
      '--user-id', String(userId),
      '--xp', achievement.xp_reward.toString()
    ]);

    res.json({
      message: 'Achievement unlocked successfully',
      achievement: {
        ...achievement,
        unlockedAt: new Date().toISOString(),
      },
      xpEarned: achievement.xp_reward,
      newLevel: xpResult.success ? xpResult.data.level : null,
      leveledUp: xpResult.success ? xpResult.data.leveled_up : false,
    });
  } catch (error) {
    console.error('Error unlocking achievement:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to unlock achievement',
    });
  }
});

/**
 * GET /api/users/:userId/achievements/recent
 * Get recently unlocked achievements
 */
router.get('/users/:userId/recent', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    const result = await executeSafeQuery(
      `SELECT
        ua.id,
        ua.achievement_id,
        a.name,
        a.description,
        a.icon,
        a.xp_reward,
        a.rarity,
        ua.unlocked_at
      FROM user_achievements ua
      JOIN achievements a ON ua.achievement_id = a.id
      WHERE ua.user_id = %s
      ORDER BY ua.unlocked_at DESC
      LIMIT %s`,
      [userId, Math.min(limit, 50)]
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch recent achievements',
      });
    }

    res.json({
      achievements: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch recent achievements',
    });
  }
});

/**
 * POST /api/users/:userId/achievements/check
 * Check if user qualifies for any new achievements
 */
router.post('/users/:userId/check', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    // Get user stats
    const statsResult = await executePythonTool('user_manager', [
      '--get-stats',
      '--user-id', String(userId)
    ]);

    if (!statsResult.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to get user stats',
      });
    }

    const stats = statsResult.data;
    const newAchievements = [];

    // Get available achievements
    const achievementsResult = await executeSafeQuery(
      `SELECT a.*
       FROM achievements a
       WHERE a.is_active = true
       AND a.id NOT IN (
         SELECT achievement_id FROM user_achievements WHERE user_id = %s
       )`,
      [userId]
    );

    if (!achievementsResult.success || !achievementsResult.data) {
      return res.json({
        newAchievements: [],
        count: 0,
      });
    }

    // Check each achievement criteria
    for (const achievement of achievementsResult.data) {
      let qualifies = false;

      switch (achievement.criteria_type) {
        case 'level':
          qualifies = stats.level >= achievement.criteria_value;
          break;
        case 'total_xp':
          qualifies = stats.total_xp >= achievement.criteria_value;
          break;
        case 'quest_count':
          qualifies = stats.quests_completed >= achievement.criteria_value;
          break;
        case 'streak':
          qualifies = stats.current_streak >= achievement.criteria_value;
          break;
        case 'daily_quests':
          qualifies = stats.daily_quests_completed >= achievement.criteria_value;
          break;
        case 'weekly_quests':
          qualifies = stats.weekly_quests_completed >= achievement.criteria_value;
          break;
      }

      if (qualifies) {
        // Auto-unlock the achievement
        const unlockResult = await executeSafeQuery(
          `INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress)
           VALUES (%s, %s, NOW(), 100)
           ON CONFLICT DO NOTHING
           RETURNING *`,
          [userId, achievement.id]
        );

        if (unlockResult.success && unlockResult.data && unlockResult.data.length > 0) {
          newAchievements.push(achievement);

          // Award XP
          await executePythonTool('user_manager', [
            '--add-xp',
            '--user-id', String(userId),
            '--xp', achievement.xp_reward.toString()
          ]);
        }
      }
    }

    res.json({
      newAchievements,
      count: newAchievements.length,
      message: newAchievements.length > 0
        ? `Unlocked ${newAchievements.length} new achievement(s)!`
        : 'No new achievements unlocked',
    });
  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to check achievements',
    });
  }
});

export { router as achievementRouter };
