/**
 * Admin User Management Routes
 * GET/POST/PATCH/DELETE users, deactivate/reactivate
 */

import { Router, Request, Response } from 'express';
import { requirePermission, requireRole } from '../middleware/adminAuth.js';
import { executePythonTool, getUserById } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/', requirePermission('users:read'), async (req: Request, res: Response) => {
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
        success: false,
        error: 'Failed to fetch users',
      });
    }

    res.json({
      success: true,
      data: {
        users: result.data || [],
        limit,
        offset,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error listing users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
router.get('/:userId', requirePermission('users:read'), async (req: Request, res: Response) => {
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
        success: false,
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      data: {
        user: userResult.data,
        stats: statsResult.data,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user details',
    });
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details
 */
router.patch('/:userId', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const updates = req.body;

    const allowedFields = ['username', 'first_name', 'timezone', 'is_active'];
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    if (Object.keys(fields).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update',
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
        success: false,
        error: 'Failed to update user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} updated by ${adminUser.username}:`, fields);

    res.json({
      success: true,
      data: {
        message: 'User updated successfully',
        user: result.data,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete user (hard delete - use with caution!)
 */
router.delete('/:userId', requireRole('super_admin'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const userResult = await getUserById(userId);

    if (!userResult.success || !userResult.data) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const result = await executePythonTool('user_manager', [
      '--delete-user',
      '--user-id',
      userId.toString(),
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.warn(`[ADMIN] User ${userId} (telegram_id: ${userResult.data.telegram_id}) DELETED by ${adminUser.username}`);

    res.json({
      success: true,
      data: {
        message: 'User deleted successfully',
        deletedUser: {
          id: userId,
          telegram_id: userResult.data.telegram_id,
          username: userResult.data.username,
        },
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/deactivate
 * Deactivate user (soft delete - preferred)
 */
router.post('/:userId/deactivate', requirePermission('users:update'), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const result = await executePythonTool('user_manager', [
      '--deactivate-user',
      '--user-id',
      userId.toString(),
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to deactivate user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} deactivated by ${adminUser.username}`);

    res.json({
      success: true,
      data: {
        message: 'User deactivated successfully',
        user: result.data,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user',
    });
  }
});

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post('/:userId/reactivate', requirePermission('users:update'), async (req: Request, res: Response) => {
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
        success: false,
        error: 'Failed to reactivate user',
      });
    }

    const adminUser = (req as any).adminUser;
    console.log(`[ADMIN] User ${userId} reactivated by ${adminUser.username}`);

    res.json({
      success: true,
      data: {
        message: 'User reactivated successfully',
        user: result.data,
      },
    });
  } catch (error) {
    console.error('[ADMIN] Error reactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reactivate user',
    });
  }
});

export { router as adminUsersRouter };
