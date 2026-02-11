import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

const router = Router();

/**
 * GET /api/users/:telegramId/preferences
 * Returns user notification/timezone preferences.
 */
router.get('/:telegramId/preferences', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = parseInt(req.params.telegramId);
  requireOwnership(req);
  if (isNaN(tid)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const user = await queryOne(
    `SELECT notification_enabled, reminder_time, timezone FROM users WHERE telegram_id = $1`,
    [tid]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(successResponse({
    notification_enabled: user.notification_enabled ?? true,
    reminder_time: user.reminder_time ?? 9,
    timezone: user.timezone || 'Europe/Moscow',
  }));
}));

/**
 * PATCH /api/users/:telegramId/preferences
 * Update user notification/timezone preferences.
 */
router.patch('/:telegramId/preferences', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = parseInt(req.params.telegramId);
  requireOwnership(req);
  if (isNaN(tid)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const { notification_enabled, reminder_time, timezone } = req.body;

  // Validate fields
  if (notification_enabled !== undefined && typeof notification_enabled !== 'boolean') {
    throw new BadRequestError('notification_enabled must be a boolean');
  }
  if (reminder_time !== undefined) {
    const rt = parseInt(reminder_time);
    if (isNaN(rt) || rt < 0 || rt > 23) {
      throw new BadRequestError('reminder_time must be an integer 0-23');
    }
  }
  if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length === 0)) {
    throw new BadRequestError('timezone must be a non-empty string');
  }

  // Build SET clause dynamically from provided fields
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (notification_enabled !== undefined) {
    sets.push(`notification_enabled = $${idx++}`);
    params.push(notification_enabled);
  }
  if (reminder_time !== undefined) {
    sets.push(`reminder_time = $${idx++}`);
    params.push(parseInt(reminder_time));
  }
  if (timezone !== undefined) {
    sets.push(`timezone = $${idx++}`);
    params.push(timezone);
  }

  if (sets.length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  params.push(tid);
  const user = await queryOne(
    `UPDATE users SET ${sets.join(', ')} WHERE telegram_id = $${idx} RETURNING notification_enabled, reminder_time, timezone`,
    params
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(successResponse({
    notification_enabled: user.notification_enabled,
    reminder_time: user.reminder_time,
    timezone: user.timezone,
  }));
}));

export { router as preferencesRouter };
