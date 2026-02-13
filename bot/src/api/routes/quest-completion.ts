import { Router, Request, Response } from 'express';
import {
  authenticateTelegram,
  mutationLimiter,
  transaction,
  invalidateUserCache,
  invalidatePrefix,
  checkAndUnlockAchievements,
  updateStreak,
  QUEST_STATUS,
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  logger,
} from './quest-helpers.js';
import { awardXp } from '../../utils/xpAward.js';
import { safeParseInt } from '../../utils/validation.js';

const log = logger.child({ component: 'quests' });

const router = Router();

/**
 * POST /api/quests/:questId/complete
 * Mark a quest as completed
 */
router.post('/:questId/complete', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const questId = safeParseInt(req.params.questId, 0);

  // Transaction: fetch with row lock, validate, mark completed, award XP
  const result = await transaction(async (client) => {
    // SELECT FOR UPDATE locks the row to prevent concurrent double-completion (TOCTOU)
    const { rows } = await client.query(
      `SELECT qi.id, qi.user_id, qi.status, q.title, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.id = $1
       FOR UPDATE OF qi`,
      [questId]
    );
    const instance = rows[0] ?? null;

    if (!instance) {
      throw new NotFoundError('Quest instance not found');
    }
    if (instance.status === QUEST_STATUS.COMPLETED) {
      throw new BadRequestError('Quest already completed');
    }

    const xpReward = instance.xp_reward;

    await client.query(
      `UPDATE quest_instances SET status = 'completed', completed_at = NOW(), xp_awarded = $1 WHERE id = $2`,
      [xpReward, questId]
    );
    const xpResult = await awardXp(client, instance.user_id, xpReward);
    return {
      userId: instance.user_id,
      modeId: instance.mode_id,
      xpReward,
      newLevel: xpResult.leveledUp ? xpResult.newLevel : null,
      leveledUp: xpResult.leveledUp,
    };
  });

  invalidateUserCache(result.userId);
  invalidatePrefix(`analytics:mode:${result.userId}:`);
  invalidatePrefix(`analytics:modes:${result.userId}`);
  invalidatePrefix(`analytics:summary:${result.userId}`);

  // Await streak + achievement checks before responding
  await Promise.allSettled([
    updateStreak(result.userId, result.modeId),
    checkAndUnlockAchievements(result.userId),
  ]).catch((err) => log.error('Post-completion side effects failed', err as Error));

  res.json(successResponse({
    message: 'Quest completed successfully',
    xpEarned: result.xpReward,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  }));
}));

export { router as questCompletionRouter };
