import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { query, queryOne, transaction } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { awardXp } from '../../utils/xpAward.js';

const router = Router();

/**
 * GET /api/achievements
 * Get all available achievements.
 * Cached for 5 minutes — achievements rarely change.
 */
router.get('/', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
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

  res.json(successResponse(achievements));
}));

/**
 * GET /api/achievements/categories
 * Returns distinct achievement categories (mode names + 'general').
 * Cached for 5 minutes.
 */
router.get('/categories', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const categories = await cached('achievements:categories', TTL.MEDIUM, async () => {
    const rows = await query(
      `SELECT DISTINCT COALESCE(criteria->>'mode', 'general') AS category
       FROM achievements
       ORDER BY category ASC`
    );
    return rows.map((r: any) => r.category);
  });

  res.json(successResponse(categories));
}));

/**
 * GET /api/users/:userId/achievements
 * Get user's unlocked achievements
 */
router.get('/users/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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

  res.json(successResponse({
    achievements: rows,
    unlocked: unlockedCount,
    total: totalCount,
    progress: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
  }));
}));

/**
 * GET /api/users/:userId/achievements/available
 * Uses LEFT JOIN instead of NOT IN for better performance.
 */
router.get('/users/:userId/available', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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

  res.json(successResponse({ achievements: rows, count: rows.length }));
}));

/**
 * POST /api/users/:userId/:achievementId/unlock
 * Uses INSERT ON CONFLICT to avoid separate check query + race conditions.
 */
router.post('/users/:userId/:achievementId/unlock', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const achievementId = parseInt(req.params.achievementId);

  const result = await transaction(async (client) => {
    const achResult = await client.query(
      `SELECT * FROM achievements WHERE id = $1`,
      [achievementId]
    );
    if (achResult.rows.length === 0) return { error: 'not_found' } as const;
    const achievement = achResult.rows[0];

    const unlockResult = await client.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, achievement_id) DO NOTHING
       RETURNING *`,
      [userId, achievementId]
    );

    if (unlockResult.rows.length === 0) {
      return { error: 'already_unlocked' } as const;
    }

    const xpResult = await awardXp(client, userId, achievement.xp_bonus);

    return { achievement, unlocked: unlockResult.rows[0], xpResult };
  });

  if (result.error === 'not_found') {
    throw new NotFoundError('Achievement not found');
  }
  if (result.error === 'already_unlocked') {
    throw new BadRequestError('Achievement already unlocked');
  }

  res.json(successResponse({
    message: 'Achievement unlocked successfully',
    achievement: result.achievement,
    xpEarned: result.achievement.xp_bonus,
    totalXp: result.xpResult.totalXp,
    newLevel: result.xpResult.newLevel,
    leveledUp: result.xpResult.leveledUp,
  }));
}));

/**
 * GET /api/users/:userId/achievements/recent
 */
router.get('/users/:userId/recent', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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

  res.json(successResponse({ achievements: rows, count: rows.length }));
}));

/**
 * POST /api/users/:userId/achievements/check
 * Delegates to achievementEngine for criteria checking and unlocking.
 */
router.post('/users/:userId/check', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const newAchievements = await checkAndUnlockAchievements(userId);

  res.json(successResponse({
    newAchievements,
    count: newAchievements.length,
  }));
}));

export { router as achievementRouter };
