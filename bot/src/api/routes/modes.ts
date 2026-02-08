import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { executePythonTool, executeSafeQuery } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/modes
 * Get all available modes
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const result = await executePythonTool('mode_manager', [
      '--list-modes'
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch modes',
      });
    }

    res.json({
      modes: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching modes:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch modes',
    });
  }
});

/**
 * GET /api/users/:userId/modes
 * Get user's active modes
 */
router.get('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('mode_manager', [
      '--get-active-modes',
      '--user-id', userId
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch user modes',
      });
    }

    res.json({
      modes: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching user modes:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user modes',
    });
  }
});

/**
 * GET /api/users/:userId/modes/summary
 * Get mode summary with quest counts
 */
router.get('/users/:userId/summary', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('mode_manager', [
      '--get-mode-summary',
      '--user-id', userId
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch mode summary',
      });
    }

    res.json({
      summary: result.data || [],
    });
  } catch (error) {
    console.error('Error fetching mode summary:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch mode summary',
    });
  }
});

/**
 * POST /api/users/:userId/modes
 * Add modes to user
 */
router.post('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { modes } = req.body; // Array of mode IDs or names

    if (!modes || !Array.isArray(modes) || modes.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid modes array',
      });
    }

    // Convert to comma-separated string
    const modesString = modes.join(',');

    const result = await executePythonTool('mode_manager', [
      '--add-modes',
      '--user-id', userId,
      '--modes', modesString
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to add modes',
      });
    }

    res.json({
      message: 'Modes added successfully',
      modes: result.data || [],
    });
  } catch (error) {
    console.error('Error adding modes:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to add modes',
    });
  }
});

/**
 * DELETE /api/users/:userId/modes/:modeId
 * Remove a mode from user
 */
router.delete('/users/:userId/:modeId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId, modeId } = req.params;

    const result = await executePythonTool('mode_manager', [
      '--remove-mode',
      '--user-id', userId,
      '--mode-id', modeId
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to remove mode',
      });
    }

    res.json({
      message: 'Mode removed successfully',
    });
  } catch (error) {
    console.error('Error removing mode:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to remove mode',
    });
  }
});

/**
 * PATCH /api/users/:userId/modes/:modeId
 * Update mode settings for user
 */
router.patch('/users/:userId/:modeId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const modeId = parseInt(req.params.modeId);
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing settings object',
      });
    }

    // Update user_modes settings
    const result = await executeSafeQuery(
      `UPDATE user_modes
       SET settings = %s::jsonb,
           updated_at = NOW()
       WHERE user_id = %s AND mode_id = %s
       RETURNING *`,
      [JSON.stringify(settings), userId, modeId]
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to update mode settings',
      });
    }

    res.json({
      message: 'Mode settings updated successfully',
      settings: result.data && result.data[0] ? result.data[0].settings : settings,
    });
  } catch (error) {
    console.error('Error updating mode settings:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update mode settings',
    });
  }
});

/**
 * GET /api/modes/:modeId/quests
 * Get quest templates for a specific mode
 */
router.get('/:modeId/quests', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const modeId = parseInt(req.params.modeId);

    const result = await executeSafeQuery(
      `SELECT
        id,
        name,
        description,
        xp_reward,
        frequency,
        difficulty,
        default_target,
        is_active
      FROM quest_templates
      WHERE mode_id = %s
      AND is_active = true
      ORDER BY frequency, difficulty`,
      [modeId]
    );

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch mode quests',
      });
    }

    res.json({
      quests: result.data || [],
      count: result.data?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching mode quests:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch mode quests',
    });
  }
});

export { router as modeRouter };
