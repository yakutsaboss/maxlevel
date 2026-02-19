/**
 * Admin Notification Center Routes
 * GET/PATCH/POST notifications for admin bell icon dropdown
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/adminAuth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  NotFoundError,
} from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { safeParseInt, clampPagination } from '../../utils/validation.js';

const log = logger.child({ component: 'adminNotifications' });

const router = Router();

const VALID_TYPES = ['new_registration', 'achievement_unlock', 'payment', 'system_alert', 'tier_change'] as const;

/**
 * GET /api/admin/notifications
 * List notifications with pagination and optional type/read filters
 */
router.get('/', requirePermission('notifications:read'), asyncHandler(async (req: Request, res: Response) => {
  const { limit, offset } = clampPagination(
    safeParseInt(req.query.limit as string, 20),
    safeParseInt(req.query.offset as string, 0),
  );
  const typeFilter = req.query.type as string | undefined;
  const readFilter = req.query.is_read as string | undefined;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (typeFilter && VALID_TYPES.includes(typeFilter as typeof VALID_TYPES[number])) {
    conditions.push(`n.type = $${paramIdx++}`);
    params.push(typeFilter);
  }

  if (readFilter === 'true') {
    conditions.push(`n.is_read = true`);
  } else if (readFilter === 'false') {
    conditions.push(`n.is_read = false`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const notifications = await query(
    `SELECT n.*, u.username AS related_username, u.first_name AS related_first_name
     FROM admin_notifications n
     LEFT JOIN users u ON n.related_user_id = u.id
     ${whereClause}
     ORDER BY n.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  const countResult = await queryOne(
    `SELECT COUNT(*)::int AS total FROM admin_notifications n ${whereClause}`,
    params
  );

  res.json(successResponse({
    notifications,
    total: countResult?.total ?? 0,
    limit,
    offset,
  }));
}));

/**
 * GET /api/admin/notifications/unread-count
 * Returns the count of unread notifications
 */
router.get('/unread-count', requirePermission('notifications:read'), asyncHandler(async (_req: Request, res: Response) => {
  const result = await queryOne(
    'SELECT COUNT(*)::int AS count FROM admin_notifications WHERE is_read = false'
  );

  res.json(successResponse({ count: result?.count ?? 0 }));
}));

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark a single notification as read
 */
router.patch('/:id/read', requirePermission('notifications:read'), asyncHandler(async (req: Request, res: Response) => {
  const id = safeParseInt(req.params.id, 0);

  const notification = await queryOne(
    'UPDATE admin_notifications SET is_read = true WHERE id = $1 RETURNING *',
    [id]
  );

  if (!notification) {
    throw new NotFoundError('Notification not found');
  }

  log.info(`Notification ${id} marked as read`);

  res.json(successResponse({ notification }));
}));

/**
 * POST /api/admin/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', requirePermission('notifications:read'), asyncHandler(async (_req: Request, res: Response) => {
  const updatedCount = await execute(
    'UPDATE admin_notifications SET is_read = true WHERE is_read = false'
  );

  log.info(`Marked all notifications as read (${updatedCount} updated)`);

  res.json(successResponse({ message: 'All notifications marked as read' }));
}));

export { router as adminNotificationsRouter };
