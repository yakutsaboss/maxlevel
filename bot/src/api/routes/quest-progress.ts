import { Router, Request, Response } from 'express';
import {
  authenticateTelegram,
  authorizeUser,
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
  ForbiddenError,
  logger,
} from './quest-helpers.js';
import { awardXp } from '../../utils/xpAward.js';
import { safeParseInt } from '../../utils/validation.js';

const log = logger.child({ component: 'quests' });

const router = Router();

/**
 * PATCH /api/quests/:questId/progress
 * Update quest progress. Auto-completes if progress reaches target.
 */
router.patch('/:questId/progress', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const questId = safeParseInt(req.params.questId, 0);
  const { progress } = req.body;

  if (questId === 0) {
    throw new BadRequestError('Invalid quest ID');
  }
  if (progress === undefined || typeof progress !== 'number' || progress < 0) {
    throw new BadRequestError('progress must be a non-negative number');
  }

  // Use transaction with FOR UPDATE to prevent concurrent progress races
  const result = await transaction(async (client) => {
    const questRow = await client.query(
      `SELECT qi.id, qi.user_id, qi.status, qi.check_in_count AS current_progress,
              q.xp_reward, q.title, q.mode_id, qi.target
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.id = $1
       FOR UPDATE OF qi`,
      [questId]
    );
    const quest = questRow.rows[0] as { id: number; user_id: number; status: string; current_progress: number; xp_reward: number; title: string; mode_id: number; target: number } | undefined;

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
      await client.query(
        `UPDATE quest_instances SET check_in_count = $1, status = 'completed', completed_at = NOW(), xp_awarded = $2 WHERE id = $3`,
        [clampedProgress, quest.xp_reward, questId]
      );
      const xpResult = await awardXp(client, quest.user_id, quest.xp_reward);

      return {
        userId: quest.user_id,
        modeId: quest.mode_id,
        completed: true,
        response: {
          id: questId,
          status: QUEST_STATUS.COMPLETED,
          progress: clampedProgress,
          target,
          xpEarned: quest.xp_reward,
          newLevel: xpResult.leveledUp ? xpResult.newLevel : null,
          leveledUp: xpResult.leveledUp,
        },
      };
    }

    // Just update progress
    await client.query(
      `UPDATE quest_instances SET check_in_count = $1 WHERE id = $2`,
      [clampedProgress, questId]
    );

    return {
      userId: quest.user_id,
      modeId: quest.mode_id,
      completed: false,
      response: {
        id: questId,
        status: quest.status,
        progress: clampedProgress,
        target,
        xpEarned: 0,
        newLevel: null,
        leveledUp: false,
      },
    };
  });

  invalidateUserCache(result.userId);
  invalidatePrefix(`analytics:mode:${result.userId}:`);
  invalidatePrefix(`analytics:modes:${result.userId}`);
  invalidatePrefix(`analytics:summary:${result.userId}`);

  if (result.completed) {
    // Fire-and-forget: update streak and check achievements
    Promise.allSettled([
      updateStreak(result.userId, result.modeId),
      checkAndUnlockAchievements(result.userId),
    ]).catch((err) => log.error('Post-progress side effects failed', err as Error));
  }

  res.json(successResponse(result.response));
}));

export { router as questProgressRouter };
