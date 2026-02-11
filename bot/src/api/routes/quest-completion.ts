import { Router, Request, Response } from 'express';
import {
  authenticateTelegram,
  mutationLimiter,
  queryOne,
  transaction,
  invalidateUserCache,
  checkAndUnlockAchievements,
  updateStreak,
  QUEST_STATUS,
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  logger,
} from './quest-helpers.js';

const log = logger.child({ component: 'quests' });

const router = Router();

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
  ]).catch((err) => log.error('Post-completion side effects failed', err as Error));

  res.json(successResponse({
    message: 'Quest completed successfully',
    xpEarned: xpReward,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  }));
}));

export { router as questCompletionRouter };
