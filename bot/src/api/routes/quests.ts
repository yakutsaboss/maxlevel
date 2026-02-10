import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { executePythonTool } from '../../utils/pythonTools.js';
import { queryOne, transaction } from '../../utils/db.js';
import { invalidateUserCache } from '../../utils/cache.js';
import { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';

const router = Router();

/**
 * GET /api/users/:userId/quests/active
 * Get all active quests for a user
 */
router.get('/users/:userId/active', authenticateTelegram, authorizeUser, readLimiter, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('quest_manager', [
      '--get-active',
      '--user-id', userId,
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch active quests',
      });
    }

    const data = result.data as any;
    res.json({
      success: true,
      data: {
        quests: data?.quests || [],
        count: data?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching active quests:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch active quests',
    });
  }
});

/**
 * GET /api/users/:userId/quests/completed
 * Get completed quests for a user
 */
router.get('/users/:userId/completed', authenticateTelegram, authorizeUser, readLimiter, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await executePythonTool('quest_manager', [
      '--get-completed',
      '--user-id', userId,
      '--limit', limit.toString(),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch completed quests',
      });
    }

    const data = result.data as any;
    res.json({
      success: true,
      data: {
        quests: data?.quests || [],
        count: data?.count || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching completed quests:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch completed quests',
    });
  }
});

/**
 * POST /api/quests/:questId/complete
 * Mark a quest as completed
 */
router.post('/:questId/complete', authenticateTelegram, mutationLimiter, async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;

    const result = await executePythonTool('quest_manager', [
      '--complete-quest',
      '--quest-id', questId,
    ]);

    if (!result.success) {
      const data = result.data as any;
      const errorMsg = data?.error || result.error || 'Failed to complete quest';

      if (errorMsg.includes('not found')) {
        return res.status(404).json({ error: 'Not Found', message: errorMsg });
      }
      if (errorMsg.includes('already completed')) {
        return res.status(400).json({ error: 'Bad Request', message: errorMsg });
      }
      return res.status(500).json({ error: 'Server Error', message: errorMsg });
    }

    const data = result.data as any;

    // Fire-and-forget: update streak and check achievements
    const questInfo = await queryOne(
      `SELECT q.mode_id, qi.user_id FROM quest_instances qi JOIN quests q ON q.id = qi.quest_id WHERE qi.id = $1`,
      [parseInt(questId)]
    );
    if (questInfo) {
      const uid = questInfo.user_id;
      const modeId = questInfo.mode_id;
      Promise.allSettled([
        executePythonTool('streak_manager', ['--update-streak', '--user-id', String(uid), '--mode-id', String(modeId)]),
        checkAndUnlockAchievements(uid),
      ]).catch(console.error);
    }

    res.json({
      success: true,
      data: {
        message: 'Quest completed successfully',
        xpEarned: data?.xp_awarded || 0,
        newLevel: data?.new_level || null,
        leveledUp: !!data?.new_level,
      },
    });
  } catch (error) {
    console.error('Error completing quest:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to complete quest',
    });
  }
});

/**
 * GET /api/users/:userId/quests/stats
 * Get quest statistics for a user
 */
router.get('/users/:userId/stats', authenticateTelegram, authorizeUser, readLimiter, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('quest_manager', [
      '--get-stats',
      '--user-id', userId,
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch quest stats',
      });
    }

    const data = result.data as any;
    res.json({ success: true, data: data?.stats || {} });
  } catch (error) {
    console.error('Error fetching quest stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch quest stats',
    });
  }
});

/**
 * POST /api/users/:userId/quests/assign
 * Assign new quests to user (daily/weekly)
 */
router.post('/users/:userId/assign', authenticateTelegram, authorizeUser, mutationLimiter, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { frequency, count } = req.body;

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid frequency. Must be "daily" or "weekly"',
      });
    }

    const operation = frequency === 'daily' ? '--assign-daily' : '--assign-weekly';
    const args = [operation, '--user-id', userId];
    if (count) {
      args.push('--count', count.toString());
    }

    const result = await executePythonTool('quest_manager', args);

    if (!result.success) {
      const data = result.data as any;
      return res.status(400).json({
        error: 'Bad Request',
        message: data?.error || 'Failed to assign quests',
      });
    }

    const data = result.data as any;
    res.json({
      success: true,
      data: {
        message: `${data?.count || 0} ${frequency} quests assigned successfully`,
        quests: data?.quests || [],
      },
    });
  } catch (error) {
    console.error('Error assigning quests:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to assign quests',
    });
  }
});

/**
 * PATCH /api/quests/:questId/progress
 * Update quest progress. Auto-completes if progress reaches target.
 */
router.patch('/:questId/progress', authenticateTelegram, authorizeUser, mutationLimiter, async (req: Request, res: Response) => {
  try {
    const questId = parseInt(req.params.questId);
    const { progress } = req.body;

    if (isNaN(questId)) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid quest ID' });
    }
    if (progress === undefined || typeof progress !== 'number' || progress < 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'progress must be a non-negative number' });
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
      return res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
    }
    if (quest.user_id !== req.dbUser?.id) {
      return res.status(403).json({ error: 'Forbidden', message: 'You do not have permission to update this quest' });
    }
    if (quest.status === 'completed') {
      return res.status(400).json({ error: 'Bad Request', message: 'Quest is already completed' });
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
        executePythonTool('streak_manager', ['--update-streak', '--user-id', String(quest.user_id), '--mode-id', String(quest.mode_id)]),
        checkAndUnlockAchievements(quest.user_id),
      ]).catch(console.error);

      return res.json({
        success: true,
        data: {
          id: questId,
          status: 'completed',
          progress: clampedProgress,
          target,
          xpEarned: quest.xp_reward,
          newLevel: result?.current_level || null,
          leveledUp: true,
        },
      });
    }

    // Just update progress
    await queryOne(
      `UPDATE quest_instances SET check_in_count = $1 WHERE id = $2 RETURNING id`,
      [clampedProgress, questId]
    );

    invalidateUserCache(quest.user_id);

    res.json({
      success: true,
      data: {
        id: questId,
        status: quest.status,
        progress: clampedProgress,
        target,
        xpEarned: 0,
        newLevel: null,
        leveledUp: false,
      },
    });
  } catch (error) {
    console.error('Error updating quest progress:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update quest progress' });
  }
});

export { router as questRouter };
