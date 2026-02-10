/**
 * Admin User Management Routes
 * GET/POST/PATCH/DELETE users, deactivate/reactivate
 */

import { Router, Request, Response } from 'express';
import { requirePermission, requireRole } from '../middleware/adminAuth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
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

  const users = await query(
    `SELECT * FROM users ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY id LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json(successResponse({
    users,
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

  const user = await queryOne('SELECT * FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const stats = await queryOne('SELECT * FROM user_stats WHERE user_id = $1', [userId]);

  res.json(successResponse({
    user,
    stats,
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

  const setClauses: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  for (const [key, value] of Object.entries(fields)) {
    setClauses.push(`${key} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }
  values.push(userId);

  const updatedUser = await queryOne(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );

  if (!updatedUser) {
    throw new NotFoundError('User not found');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} updated by ${adminUser.username}:`, fields);

  res.json(successResponse({
    message: 'User updated successfully',
    user: updatedUser,
  }));
}));

/**
 * DELETE /api/admin/users/:userId
 * Delete user (hard delete - use with caution!)
 */
router.delete('/:userId', requireRole('super_admin'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const user = await queryOne('SELECT id, telegram_id, username FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  await execute('DELETE FROM users WHERE id = $1', [userId]);

  const adminUser = (req as any).adminUser;
  console.warn(`[ADMIN] User ${userId} (telegram_id: ${user.telegram_id}) DELETED by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User deleted successfully',
    deletedUser: {
      id: userId,
      telegram_id: user.telegram_id,
      username: user.username,
    },
  }));
}));

/**
 * POST /api/admin/users/:userId/deactivate
 * Deactivate user (soft delete - preferred)
 */
router.post('/:userId/deactivate', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const user = await queryOne('UPDATE users SET is_active = false WHERE id = $1 RETURNING *', [userId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} deactivated by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User deactivated successfully',
    user,
  }));
}));

/**
 * POST /api/admin/users/:userId/reactivate
 * Reactivate a deactivated user
 */
router.post('/:userId/reactivate', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const user = await queryOne('UPDATE users SET is_active = true WHERE id = $1 RETURNING *', [userId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const adminUser = (req as any).adminUser;
  console.log(`[ADMIN] User ${userId} reactivated by ${adminUser.username}`);

  res.json(successResponse({
    message: 'User reactivated successfully',
    user,
  }));
}));

export { router as adminUsersRouter };
