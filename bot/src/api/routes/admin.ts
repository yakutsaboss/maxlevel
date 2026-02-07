/**
 * Admin API Routes
 * Secure endpoints for administrative tasks
 */

import { Router, Request, Response } from 'express';
import { authenticateAdmin, requirePermission, requireRole } from '../middleware/adminAuth';
import { executePythonTool, getUserById, getUserByTelegramId } from '../../utils/pythonTools';

const router = Router();

// All admin routes require authentication
router.use(authenticateAdmin);

/**
 * GET /api/admin/stats
 * Get overall system statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get total users
    const usersResult = await executePythonTool('db_operations', [
      '--query',
      'SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_active = true) as active FROM users',
    ]);

    // Get total quests
    const questsResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
       FROM quest_instances`,
    ]);

    // Get achievements stats
    const achievementsResult = await executePythonTool('db_operations', [
      '--query',
      'SELECT COUNT(DISTINCT user_id) as users_with_achievements FROM user_achievements',
    ]);

    res.json({
      users: usersResult.data?.[0] || { total: 0, active: 0 },
      quests: questsResult.data?.[0] || { total: 0, active: 0, completed: 0 },
      achievements: achievementsResult.data?.[0] || { users_with_achievements: 0 },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching stats:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch system statistics',
    });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/users', requirePermission('users:read'), async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const activeOnly = req.query.active === 'true';

    const result = await executePythonTool('user_manager', [
      '--list-users',
      '--limit',
      limit.toString(),
      '--offset',
      offset.toString(),
      ...(activeOnly ? [] : ['--include-inactive']),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch users',
      });
    }

    res.json({
      users: result.data || [],
      limit,
      offset,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error listing users:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
router.get('/users/:userId', requirePermission('users:read'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const userResult = await getUserById(userId);
    const statsResult = await executePythonTool('user_manager', [
      '--get-stats',
      '--user-id',
      userId.toString(),
    ]);

    if (!userResult.success || !userResult.data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    res.json({
      user: userResult.data,
      stats: statsResult.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch user details',
    });
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details
 */
router.patch('/users/:userId', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const updates = req.body;

    // Validate updates
    const allowedFields = ['username', 'first_name', 'timezone', 'is_active'];
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No valid fields to update',
      });
    }

    const result = await executePythonTool('user_manager', [
      '--update-profile',
      '--user-id',
      userId.toString(),
      '--fields',
      JSON.stringify(fields),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to update user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} updated by ${adminUser.username}:`, fields);

    res.json({
      message: 'User updated successfully',
      user: result.data,
    });
  } catch (error) {
    console.error('[ADMIN] Error updating user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user (hard delete - use with caution!)
 */
router.delete('/users/:userId', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    // Get user first to log deletion
    const userResult = await getUserById(userId);

    if (!userResult.success || !userResult.data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found',
      });
    }

    const result = await executePythonTool('user_manager', [
      '--delete-user',
      '--user-id',
      userId.toString(),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to delete user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.warn(`[ADMIN] User ${userId} (telegram_id: ${userResult.data.telegram_id}) DELETED by ${adminUser.username}`);

    res.json({
      message: 'User deleted successfully',
      deletedUser: {
        id: userId,
        telegram_id: userResult.data.telegram_id,
        username: userResult.data.username,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to delete user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/deactivate
 * Deactivate user (soft delete - preferred)
 */
router.post('/users/:userId/deactivate', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await executePythonTool('user_manager', [
      '--deactivate-user',
      '--user-id',
      userId.toString(),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to deactivate user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} deactivated by ${adminUser.username}`);

    res.json({
      message: 'User deactivated successfully',
      user: result.data,
    });
  } catch (error) {
    console.error('[ADMIN] Error deactivating user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to deactivate user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post('/users/:userId/reactivate', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await executePythonTool('user_manager', [
      '--update-profile',
      '--user-id',
      userId.toString(),
      '--fields',
      JSON.stringify({ is_active: true }),
    ]);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to reactivate user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} reactivated by ${adminUser.username}`);

    res.json({
      message: 'User reactivated successfully',
      user: result.data,
    });
  } catch (error) {
    console.error('[ADMIN] Error reactivating user:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to reactivate user',
    });
  }
});

/**
 * GET /api/admin/modes
 * List all modes
 */
router.get('/modes', async (req: Request, res: Response) => {
  try {
    const result = await executePythonTool('mode_manager', ['--list-modes']);

    if (!result.success) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch modes',
      });
    }

    res.json({
      modes: result.data || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ADMIN] Error listing modes:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch modes',
    });
  }
});

/**
 * POST /api/admin/broadcast
 * Send broadcast message to all active users
 */
router.post('/broadcast', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const { message, userFilter } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Message is required',
      });
    }

    // This would need to be implemented in bot handler
    // For now, return not implemented
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Broadcast feature not yet implemented. Coming soon!',
    });
  } catch (error) {
    console.error('[ADMIN] Error broadcasting:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to send broadcast',
    });
  }
});

/**
 * GET /api/admin/logs
 * Get recent system logs
 */
router.get('/logs', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string) || 100;

    // This would read from log files
    // For now, return not implemented
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Log viewing not yet implemented. Use PM2 logs or Docker logs instead.',
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching logs:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch logs',
    });
  }
});

export { router as adminRouter };
