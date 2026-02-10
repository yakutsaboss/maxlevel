import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { invalidateUserCache } from '../../utils/cache.js';
import { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';
import { updateStreak } from '../../utils/streak.js';
import { QUEST_STATUS, QUEST_FREQUENCY } from '../utils/constants.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

const router = Router();

/**
 * GET /api/users/:userId/quests/active
 * Get all active quests for a user
 */
router.get('/users/:userId/active', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const quests = await query(
    `SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, q.mode_id, m.name AS mode_name,
            m.icon_emoji AS mode_icon, qi.status, qi.instance_date,
            qi.check_in_count, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC`,
    [userId]
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

/**
 * GET /api/users/:userId/quests/completed
 * Get completed quests for a user
 */
router.get('/users/:userId/completed', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

  const quests = await query(
    `SELECT qi.id, q.title AS name, q.xp_reward, q.quest_type, q.difficulty,
            m.name AS mode_name, m.icon_emoji AS mode_icon,
            qi.xp_awarded, qi.completed_at, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status = 'completed'
     ORDER BY qi.completed_at DESC LIMIT $2`,
    [userId, limit]
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

/**
 * POST /api/quests/:questId/complete
 * Mark a quest as completed
 */
router.post('/:questId/complete', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const questId = parseInt(req.params.questId);

  // Fetch quest instance with template info
  const instance = await queryOne(
    `SELECT qi.id, qi.user_id, qi.status, q.title, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     WHERE qi.id = $1`,
    [questId]
  );

  if (!instance) {
    throw new NotFoundError('Quest instance not found');
  }
  if (instance.status === QUEST_STATUS.COMPLETED) {
    throw new BadRequestError('Quest already completed');
  }

  const xpReward = instance.xp_reward;

  // Transaction: mark completed, award XP, compute level
  const result = await transaction(async (client) => {
    await client.query(
      `UPDATE quest_instances SET status = 'completed', completed_at = NOW(), xp_awarded = $1 WHERE id = $2`,
      [xpReward, questId]
    );
    const userRow = await client.query(
      `UPDATE users SET total_xp = total_xp + $1 WHERE id = $2 RETURNING total_xp, current_level`,
      [xpReward, instance.user_id]
    );
    const user = userRow.rows[0];
    const newLevel = Math.floor(user.total_xp / 500) + 1;
    const leveledUp = newLevel > user.current_level;
    if (leveledUp) {
      await client.query(`UPDATE users SET current_level = $1 WHERE id = $2`, [newLevel, instance.user_id]);
    }
    return { newLevel: leveledUp ? newLevel : null, leveledUp };
  });

  invalidateUserCache(instance.user_id);

  // Fire-and-forget: update streak and check achievements
  Promise.allSettled([
    updateStreak(instance.user_id, instance.mode_id),
    checkAndUnlockAchievements(instance.user_id),
  ]).catch(console.error);

  res.json(successResponse({
    message: 'Quest completed successfully',
    xpEarned: xpReward,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  }));
}));

/**
 * GET /api/users/:userId/quests/stats
 * Get quest statistics for a user
 */
router.get('/users/:userId/stats', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const [totalRow, activeRow, dailyRow, weeklyRow] = await Promise.all([
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status = 'completed'`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status IN ('pending', 'ready', 'in_progress')`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances qi JOIN quests q ON qi.quest_id = q.id WHERE qi.user_id = $1 AND qi.status = 'completed' AND q.quest_type = 'daily'`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances qi JOIN quests q ON qi.quest_id = q.id WHERE qi.user_id = $1 AND qi.status = 'completed' AND q.quest_type = 'weekly'`, [userId]),
  ]);

  res.json(successResponse({
    total_completed: totalRow?.total ?? 0,
    active_quests: activeRow?.total ?? 0,
    daily_completed: dailyRow?.total ?? 0,
    weekly_completed: weeklyRow?.total ?? 0,
  }));
}));

/**
 * POST /api/users/:userId/quests/assign
 * Assign new quests to user (daily/weekly)
 */
router.post('/users/:userId/assign', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const { frequency, count: requestedCount } = req.body;
  const isDaily = frequency === QUEST_FREQUENCY.DAILY;

  if (!frequency || !Object.values(QUEST_FREQUENCY).includes(frequency)) {
    throw new BadRequestError('Invalid frequency. Must be "daily" or "weekly"');
  }

  const defaultCount = isDaily ? 3 : 2;
  const questCount = requestedCount ? parseInt(requestedCount) : defaultCount;

  // Get user's active modes
  const modeRows = await query<{ mode_id: number }>(
    'SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const modeIds = modeRows.map(r => r.mode_id);
  if (modeIds.length === 0) {
    throw new BadRequestError('User has no active modes');
  }

  const today = new Date().toISOString().split('T')[0];

  let available: any[];
  if (isDaily) {
    // Daily: find templates not assigned today
    available = await query(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
       AND q.id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
       ORDER BY RANDOM() LIMIT $4`,
      [modeIds, userId, today, questCount]
    );
  } else {
    // Weekly: find templates not actively assigned in past 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    available = await query(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'weekly'
       AND q.id NOT IN (
         SELECT quest_id FROM quest_instances
         WHERE user_id = $2 AND instance_date >= $3 AND status IN ('pending', 'ready', 'in_progress')
       )
       ORDER BY RANDOM() LIMIT $4`,
      [modeIds, userId, weekAgo, questCount]
    );
  }

  if (available.length === 0) {
    throw new BadRequestError(`No available ${frequency} quests for user modes`);
  }

  const difficultyTarget: Record<string, number> = { easy: 1, medium: 3, hard: 5 };
  const assigned: any[] = [];

  for (const quest of available) {
    const target = difficultyTarget[quest.difficulty] ?? 1;
    const inst = await queryOne(
      `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
      [userId, quest.id, today, target]
    );
    if (inst) {
      assigned.push({
        id: inst.id,
        quest_id: quest.id,
        title: quest.title,
        description: quest.description,
        xp_reward: quest.xp_reward,
        quest_type: quest.quest_type,
        difficulty: quest.difficulty,
        target,
        instance_date: today,
        status: 'pending',
      });
    }
  }

  res.json(successResponse({
    message: `${assigned.length} ${frequency} quests assigned successfully`,
    quests: assigned,
  }));
}));

/**
 * PATCH /api/quests/:questId/progress
 * Update quest progress. Auto-completes if progress reaches target.
 */
router.patch('/:questId/progress', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const questId = parseInt(req.params.questId);
  const { progress } = req.body;

  if (isNaN(questId)) {
    throw new BadRequestError('Invalid quest ID');
  }
  if (progress === undefined || typeof progress !== 'number' || progress < 0) {
    throw new BadRequestError('progress must be a non-negative number');
  }

  // Fetch the quest instance and its target
  const quest = await queryOne(
    `SELECT qi.id, qi.user_id, qi.status, qi.check_in_count AS current_progress,
            q.xp_reward, q.title, q.mode_id, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     WHERE qi.id = $1`,
    [questId]
  );

  if (!quest) {
    throw new NotFoundError('Quest not found');
  }
  if (quest.user_id !== req.dbUser?.id) {
    throw new ForbiddenError('You do not have permission to update this quest');
  }
  if (quest.status === QUEST_STATUS.COMPLETED) {
    throw new BadRequestError('Quest is already completed');
  }

  const target = quest.target || 1;
  const clampedProgress = Math.min(progress, target);

  if (clampedProgress >= target) {
    // Auto-complete: award XP, update progress, mark completed
    const result = await transaction(async (client) => {
      await client.query(
        `UPDATE quest_instances SET check_in_count = $1, status = 'completed', completed_at = NOW(), xp_awarded = $2 WHERE id = $3`,
        [clampedProgress, quest.xp_reward, questId]
      );
      const userRow = await client.query(
        `UPDATE users SET total_xp = total_xp + $1, current_level = ((total_xp + $1) / 500) + 1 WHERE id = $2 RETURNING total_xp, current_level`,
        [quest.xp_reward, quest.user_id]
      );
      return userRow.rows[0];
    });

    invalidateUserCache(quest.user_id);

    // Fire-and-forget: update streak and check achievements
    Promise.allSettled([
      updateStreak(quest.user_id, quest.mode_id),
      checkAndUnlockAchievements(quest.user_id),
    ]).catch(console.error);

    return res.json(successResponse({
      id: questId,
      status: QUEST_STATUS.COMPLETED,
      progress: clampedProgress,
      target,
      xpEarned: quest.xp_reward,
      newLevel: result?.current_level || null,
      leveledUp: true,
    }));
  }

  // Just update progress
  await queryOne(
    `UPDATE quest_instances SET check_in_count = $1 WHERE id = $2 RETURNING id`,
    [clampedProgress, questId]
  );

  invalidateUserCache(quest.user_id);

  res.json(successResponse({
    id: questId,
    status: quest.status,
    progress: clampedProgress,
    target,
    xpEarned: 0,
    newLevel: null,
    leveledUp: false,
  }));
}));

export { router as questRouter };
