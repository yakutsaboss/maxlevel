/**
 * User Notification Routes
 * GET/PATCH/POST for user-facing notification center
 */

import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt, clampPagination } from '../../utils/validation.js';

const router = Router();

const VALID_TYPE_FILTERS = ['quest', 'achievement', 'medication', 'streak', 'system'] as const;
type TypeFilter = typeof VALID_TYPE_FILTERS[number];

const TYPE_FILTER_MAP: Record<TypeFilter, string[]> = {
  quest: ['quest_complete', 'quest_assigned', 'daily_summary', 'quest_reminder'],
  achievement: ['achievement_unlock'],
  medication: ['medication_taken', 'medication_missed', 'medication_reminder'],
  streak: ['streak_warning', 'streak_milestone'],
  system: ['system', 'punishment', 'level_up', 'xp_gain'],
};

/**
 * Resolve a Telegram ID (from URL param) to the internal DB user ID.
 * The mini-app sends telegram_id in the URL, but notification_log.user_id
 * stores the internal users.id (FK). This bridge lookup is required.
 */
async function resolveInternalUserId(telegramId: number): Promise<number> {
  const user = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE telegram_id = $1',
    [telegramId]
  );
  if (!user) throw new NotFoundError('User not found');
  return user.id;
}

/**
 * GET /api/notifications/:userId
 * List notifications for a user, paginated, newest first.
 * Query params: limit, offset, type (optional filter)
 */
router.get('/:userId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.userId, 0);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid user ID');
  }

  const internalUserId = await resolveInternalUserId(telegramId);

  const { limit, offset } = clampPagination(
    safeParseInt(req.query.limit as string, 20),
    safeParseInt(req.query.offset as string, 0),
  );
  const typeFilter = req.query.type as string | undefined;

  const conditions: string[] = ['user_id = $1'];
  const params: unknown[] = [internalUserId];
  let paramIdx = 2;

  if (typeFilter && VALID_TYPE_FILTERS.includes(typeFilter as TypeFilter)) {
    const types = TYPE_FILTER_MAP[typeFilter as TypeFilter];
    const placeholders = types.map(() => `$${paramIdx++}`);
    conditions.push(`type IN (${placeholders.join(', ')})`);
    params.push(...types);
  }

  const whereClause = conditions.join(' AND ');

  const notifications = await query(
    `SELECT id, type AS activity_type, title AS description, body,
            0 AS xp_change,
            sent_at AS created_at, read_at,
            CASE WHEN read_at IS NOT NULL THEN true ELSE false END AS is_read
     FROM notification_log
     WHERE ${whereClause}
     ORDER BY sent_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  res.json(successResponse(notifications));
}));

/**
 * GET /api/notifications/:userId/unread-count
 * Returns count of unread notifications for badge display.
 */
router.get('/:userId/unread-count', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.userId, 0);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid user ID');
  }

  const internalUserId = await resolveInternalUserId(telegramId);

  const result = await queryOne(
    'SELECT COUNT(*)::int AS count FROM notification_log WHERE user_id = $1 AND read_at IS NULL',
    [internalUserId]
  );

  res.json(successResponse({ count: result?.count ?? 0 }));
}));

/**
 * PATCH /api/notifications/:notificationId/read
 * Mark a single notification as read.
 */
router.patch('/:notificationId/read', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const notificationId = safeParseInt(req.params.notificationId, 0);
  if (notificationId === 0) {
    throw new BadRequestError('Invalid notification ID');
  }

  const notification = await queryOne(
    'UPDATE notification_log SET read_at = NOW() WHERE id = $1 AND read_at IS NULL RETURNING id, read_at',
    [notificationId]
  );

  if (!notification) {
    throw new NotFoundError('Notification not found or already read');
  }

  res.json(successResponse({ id: notification.id, read_at: notification.read_at }));
}));

/**
 * POST /api/notifications/:userId/read-all
 * Mark all notifications as read for a user.
 */
router.post('/:userId/read-all', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.userId, 0);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid user ID');
  }

  const internalUserId = await resolveInternalUserId(telegramId);

  const updatedCount = await execute(
    'UPDATE notification_log SET read_at = NOW() WHERE user_id = $1 AND read_at IS NULL',
    [internalUserId]
  );

  res.json(successResponse({ updated: updatedCount }));
}));

export { router as notificationRouter };
