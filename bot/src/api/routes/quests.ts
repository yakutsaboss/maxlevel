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

    const result = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT
        uq.id,
        uq.quest_template_id,
        qt.name,
        qt.description,
        qt.xp_reward,
        qt.frequency,
        qt.difficulty,
        qt.mode_id,
        m.name as mode_name,
        uq.status,
        uq.progress,
        uq.target_value,
        uq.assigned_date,
        uq.due_date
      FROM user_quests uq
      JOIN quest_templates qt ON uq.quest_template_id = qt.id
      LEFT JOIN modes m ON qt.mode_id = m.id
      WHERE uq.user_id = ${userId}
      AND uq.status = 'active'
      ORDER BY uq.due_date ASC`
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch active quests',
      });
    }

    res.json({
      quests: result.data || [],
      count: result.data?.length || 0,
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

    const result = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT
        uq.id,
        uq.quest_template_id,
        qt.name,
        qt.description,
        qt.xp_reward,
        qt.frequency,
        qt.difficulty,
        qt.mode_id,
        m.name as mode_name,
        uq.status,
        uq.progress,
        uq.target_value,
        uq.assigned_date,
        uq.completed_date
      FROM user_quests uq
      JOIN quest_templates qt ON uq.quest_template_id = qt.id
      LEFT JOIN modes m ON qt.mode_id = m.id
      WHERE uq.user_id = ${userId}
      AND uq.status = 'completed'
      ORDER BY uq.completed_date DESC
      LIMIT ${limit}`
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch completed quests',
      });
    }

    res.json({
      quests: result.data || [],
      count: result.data?.length || 0,
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
 * GET /api/quests/:questId
 * Get quest details by ID
 */
router.get('/:questId', authenticateTelegram, readLimiter, async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;

    const result = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT
        uq.id,
        uq.user_id,
        uq.quest_template_id,
        qt.name,
        qt.description,
        qt.xp_reward,
        qt.frequency,
        qt.difficulty,
        qt.mode_id,
        m.name as mode_name,
        m.icon as mode_icon,
        uq.status,
        uq.progress,
        uq.target_value,
        uq.assigned_date,
        uq.due_date,
        uq.completed_date
      FROM user_quests uq
      JOIN quest_templates qt ON uq.quest_template_id = qt.id
      LEFT JOIN modes m ON qt.mode_id = m.id
      WHERE uq.id = ${questId}`
    ]);

    if (!result.success || !result.data || result.data.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Quest not found',
      });
    }

    res.json({
      quest: result.data[0],
    });
  } catch (error) {
    console.error('Error fetching quest details:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch quest details',
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
    const { progress } = req.body;

    // Get quest details first
    const questResult = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT uq.*, qt.xp_reward
       FROM user_quests uq
       JOIN quest_templates qt ON uq.quest_template_id = qt.id
       WHERE uq.id = ${questId}`
    ]);

    if (!questResult.success || !questResult.data || questResult.data.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Quest not found',
      });
    }

    const quest = questResult.data[0];

    if (quest.status === 'completed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Quest already completed',
      });
    }

    // Mark quest as completed
    const completeResult = await executePythonTool('db_operations.py', [
      '--query',
      `UPDATE user_quests
       SET status = 'completed',
           progress = ${progress || quest.target_value},
           completed_date = NOW()
       WHERE id = ${questId}`
    ]);

    if (!completeResult.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to complete quest',
      });
    }

    // Award XP to user
    const xpResult = await executePythonTool('user_manager.py', [
      '--add-xp',
      '--user-id', quest.user_id.toString(),
      '--xp', quest.xp_reward.toString()
    ]);

    res.json({
      message: 'Quest completed successfully',
      xpEarned: quest.xp_reward,
      newLevel: xpResult.success ? xpResult.data.level : null,
      leveledUp: xpResult.success ? xpResult.data.leveled_up : false,
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
 * PATCH /api/quests/:questId/progress
 * Update quest progress
 */
router.patch('/:questId/progress', authenticateTelegram, mutationLimiter, async (req: Request, res: Response) => {
  try {
    const { questId } = req.params;
    const { progress } = req.body;

    if (progress === undefined || progress < 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid progress value',
      });
    }

    const result = await executePythonTool('db_operations.py', [
      '--query',
      `UPDATE user_quests
       SET progress = ${progress},
           updated_at = NOW()
       WHERE id = ${questId}`
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to update quest progress',
      });
    }

    res.json({
      message: 'Quest progress updated successfully',
      progress,
    });
  } catch (error) {
    console.error('Error updating quest progress:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update quest progress',
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
    const { frequency } = req.body; // 'daily' or 'weekly'

    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid frequency. Must be "daily" or "weekly"',
      });
    }

    // Get user's active modes
    const modesResult = await executePythonTool('mode_manager.py', [
      '--get-active-modes',
      '--user-id', userId
    ]);

    if (!modesResult.success || !modesResult.data || modesResult.data.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'User has no active modes',
      });
    }

    const modeIds = modesResult.data.map((mode: any) => mode.id).join(',');

    // Get quest templates for these modes
    const templatesResult = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT * FROM quest_templates
       WHERE mode_id IN (${modeIds})
       AND frequency = '${frequency}'
       AND is_active = true
       ORDER BY RANDOM()
       LIMIT 3`
    ]);

    if (!templatesResult.success || !templatesResult.data || templatesResult.data.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'No quest templates available for user modes',
      });
    }

    // Assign quests to user
    const assignedQuests = [];
    const dueDate = frequency === 'daily'
      ? 'CURRENT_DATE + INTERVAL \'1 day\''
      : 'CURRENT_DATE + INTERVAL \'7 days\'';

    for (const template of templatesResult.data) {
      const assignResult = await executePythonTool('db_operations.py', [
        '--query',
        `INSERT INTO user_quests
         (user_id, quest_template_id, status, progress, target_value, assigned_date, due_date)
         VALUES
         (${userId}, ${template.id}, 'active', 0, ${template.default_target || 1}, CURRENT_DATE, ${dueDate})
         RETURNING *`
      ]);

      if (assignResult.success && assignResult.data) {
        assignedQuests.push({
          ...assignResult.data[0],
          template,
        });
      }
    }

    res.json({
      message: `${assignedQuests.length} ${frequency} quests assigned successfully`,
      quests: assignedQuests,
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
