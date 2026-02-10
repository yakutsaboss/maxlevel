/**
 * Admin User Management Routes
 * GET/POST/PATCH/DELETE users, deactivate/reactivate
 */

import { Router, Request, Response } from 'express';
import { requirePermission, requireRole } from '../middleware/adminAuth.js';
import { executePythonTool, getUserById } from '../../utils/pythonTools.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../utils/errors.js';

const router = Router();

/**
 * GET /api/admin/users
 * List all users with pagination
 */
router.get('/', requirePermission('users:read'), asyncHandler(async (req: Request, res: Response) => {
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
    throw new InternalServerError('Failed to fetch users');
  }

  res.json(successResponse({
    users: result.data || [],
    limit,
    offset,
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * GET /api/admin/users/:userId
 * Get detailed user information
 */
router.get('/:userId', requirePermission('users:read'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const userResult = await getUserById(userId);
  const statsResult = await executePythonTool('user_manager', [
    '--get-stats',
    '--user-id',
    userId.toString(),
  ]);

  if (!userResult.success || !userResult.data) {
    throw new NotFoundError('User not found');
  }

  res.json(successResponse({
    user: userResult.data,
    stats: statsResult.data,
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * PATCH /api/admin/users/:userId
 * Update user details
 */
router.patch('/:userId', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
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
    throw new BadRequestError('No valid fields to update');
  }

  const result = await executePythonTool('user_manager', [
    '--update-profile',
    '--user-id',
    userId.toString(),
    '--fields',
    JSON.stringify(fields),
  ]);

  if (!result.success) {
    throw new InternalServerError('Failed to update user');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} updated by ${adminUser.username}:`, fields);

  res.json(successResponse({
    message: 'User updated successfully',
    user: result.data,
  }));
}));

/**
 * DELETE /api/admin/users/:userId
 * Delete user (hard delete - use with caution!)
 */
router.delete('/:userId', requireRole('super_admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const userResult = await getUserById(userId);

  if (!userResult.success || !userResult.data) {
    throw new NotFoundError('User not found');
  }

  const result = await executePythonTool('user_manager', [
    '--delete-user',
    '--user-id',
    userId.toString(),
  ]);

  if (!result.success) {
    throw new InternalServerError('Failed to delete user');
  }

  const adminUser = (req as any).adminUser;
  console.warn(`[ADMIN] User ${userId} (telegram_id: ${userResult.data.telegram_id}) DELETED by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User deleted successfully',
    deletedUser: {
      id: userId,
      telegram_id: userResult.data.telegram_id,
      username: userResult.data.username,
    },
  }));
}));

/**
 * POST /api/admin/users/:userId/deactivate
 * Deactivate user (soft delete - preferred)
 */
router.post('/:userId/deactivate', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const result = await executePythonTool('user_manager', [
    '--deactivate-user',
    '--user-id',
    userId.toString(),
  ]);

  if (!result.success) {
    throw new InternalServerError('Failed to deactivate user');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} deactivated by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User deactivated successfully',
    user: result.data,
  }));
}));

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post('/:userId/reactivate', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const result = await executePythonTool('user_manager', [
    '--update-profile',
    '--user-id',
    userId.toString(),
    '--fields',
    JSON.stringify({ is_active: true }),
  ]);

  if (!result.success) {
    throw new InternalServerError('Failed to reactivate user');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} reactivated by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User reactivated successfully',
    user: result.data,
  }));
}));

export { router as adminUsersRouter };
