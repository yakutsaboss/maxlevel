import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { executePythonTool } from '../../utils/pythonTools.js';

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
      quests: data?.quests || [],
      count: data?.count || 0,
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
      quests: data?.quests || [],
      count: data?.count || 0,
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
    res.json({
      message: 'Quest completed successfully',
      xpEarned: data?.xp_awarded || 0,
      newLevel: data?.new_level || null,
      leveledUp: !!data?.new_level,
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
    res.json(data?.stats || {});
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
      message: `${data?.count || 0} ${frequency} quests assigned successfully`,
      quests: data?.quests || [],
    });
  } catch (error) {
    console.error('Error assigning quests:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to assign quests',
    });
  }
});

export { router as questRouter };
