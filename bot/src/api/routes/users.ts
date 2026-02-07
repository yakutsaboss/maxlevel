import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth';
import { executePythonTool } from '../../utils/pythonTools';

const router = Router();

/**
 * GET /api/users/:telegramId/stats
 * Get user stats by Telegram ID
 */
router.get('/:telegramId/stats', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;

    // Call Python tool to get user stats
    const result = await executePythonTool('user_manager.py', [
      '--get-user',
      '--telegram-id', telegramId
    ]);

    if (!result.success) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Get user stats
    const statsResult = await executePythonTool('user_manager.py', [
      '--get-stats',
      '--user-id', result.data.id.toString()
    ]);

    if (!statsResult.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to retrieve user stats',
      });
    }

    res.json({
      user: result.data,
      stats: statsResult.data,
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user stats',
    });
  }
});

/**
 * GET /api/users/:userId/profile
 * Get user profile with detailed information
 */
router.get('/:userId/profile', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Get user info
    const userResult = await executePythonTool('user_manager.py', [
      '--get-user',
      '--user-id', userId
    ]);

    if (!userResult.success) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    // Get user stats
    const statsResult = await executePythonTool('user_manager.py', [
      '--get-stats',
      '--user-id', userId
    ]);

    // Get active modes
    const modesResult = await executePythonTool('mode_manager.py', [
      '--get-active-modes',
      '--user-id', userId
    ]);

    // Get achievements count
    const achievementsResult = await executePythonTool('db_operations.py', [
      '--query',
      `SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ${userId}`
    ]);

    res.json({
      user: userResult.data,
      stats: statsResult.success ? statsResult.data : null,
      activeModes: modesResult.success ? modesResult.data : [],
      achievementsCount: achievementsResult.success ? achievementsResult.data[0]?.count || 0 : 0,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user profile',
    });
  }
});

/**
 * POST /api/users
 * Create a new user (called from bot on /start)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username } = req.body;

    if (!telegramId || !firstName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: telegramId, firstName',
      });
    }

    // Create user using Python tool
    const args = [
      '--create-user',
      '--telegram-id', telegramId.toString(),
      '--first-name', firstName
    ];

    if (lastName) {
      args.push('--last-name', lastName);
    }

    if (username) {
      args.push('--username', username);
    }

    const result = await executePythonTool('user_manager.py', args);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to create user',
      });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: result.data,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to create user',
    });
  }
});

/**
 * PATCH /api/users/:userId/xp
 * Add XP to user (for quest completion, achievements, etc.)
 */
router.patch('/:userId/xp', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid XP amount',
      });
    }

    const result = await executePythonTool('user_manager.py', [
      '--add-xp',
      '--user-id', userId,
      '--xp', amount.toString()
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to add XP',
      });
    }

    res.json({
      message: 'XP added successfully',
      newTotal: result.data.total_xp,
      newLevel: result.data.level,
      leveledUp: result.data.leveled_up || false,
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to add XP',
    });
  }
});

/**
 * PATCH /api/users/:userId/streak
 * Update user streak
 */
router.patch('/:userId/streak', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('user_manager.py', [
      '--update-streak',
      '--user-id', userId
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to update streak',
      });
    }

    res.json({
      message: 'Streak updated successfully',
      streak: result.data.current_streak,
    });
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update streak',
    });
  }
});

export { router as userRouter };
