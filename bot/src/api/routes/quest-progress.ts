import { Router, Request, Response } from 'express';
import {
  authenticateTelegram,
  authorizeUser,
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
  ForbiddenError,
  logger,
} from './quest-helpers.js';
import { awardXp } from '../../utils/xpAward.js';

const log = logger.child({ component: 'quests' });

const router = Router();

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
    const xpResult = await transaction(async (client) => {
      await client.query(
        `UPDATE quest_instances SET check_in_count = $1, status = 'completed', completed_at = NOW(), xp_awarded = $2 WHERE id = $3`,
        [clampedProgress, quest.xp_reward, questId]
      );
      return awardXp(client, quest.user_id, quest.xp_reward);
    });

    invalidateUserCache(quest.user_id);

    // Fire-and-forget: update streak and check achievements
    Promise.allSettled([
      updateStreak(quest.user_id, quest.mode_id),
      checkAndUnlockAchievements(quest.user_id),
    ]).catch((err) => log.error('Post-progress side effects failed', err as Error));

    res.json(successResponse({
      id: questId,
      status: QUEST_STATUS.COMPLETED,
      progress: clampedProgress,
      target,
      xpEarned: quest.xp_reward,
      newLevel: xpResult.leveledUp ? xpResult.newLevel : null,
      leveledUp: xpResult.leveledUp,
    }));
    return;
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

export { router as questProgressRouter };
