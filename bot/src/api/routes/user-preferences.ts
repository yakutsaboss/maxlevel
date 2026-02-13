import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { buildDynamicUpdate } from '../../utils/sqlBuilder.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

/**
 * GET /api/users/:telegramId/preferences
 * Returns user notification/timezone preferences.
 */
router.get('/:telegramId/preferences', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  if (tid === 0) {
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
  const tid = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  if (tid === 0) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const { notification_enabled, reminder_time, timezone } = req.body;

  // Validate fields
  if (notification_enabled !== undefined && typeof notification_enabled !== 'boolean') {
    throw new BadRequestError('notification_enabled must be a boolean');
  }
  if (reminder_time !== undefined) {
    const rt = safeParseInt(String(reminder_time), -1);
    if (rt < 0 || rt > 23) {
      throw new BadRequestError('reminder_time must be an integer 0-23');
    }
  }
  if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length === 0)) {
    throw new BadRequestError('timezone must be a non-empty string');
  }

  // Build SET clause dynamically from provided fields
  const fields: Record<string, unknown> = {};
  if (notification_enabled !== undefined) {
    fields.notification_enabled = notification_enabled;
  }
  if (reminder_time !== undefined) {
    fields.reminder_time = safeParseInt(String(reminder_time), 0);
  }
  if (timezone !== undefined) {
    fields.timezone = timezone;
  }

  if (Object.keys(fields).length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  const { text, values } = buildDynamicUpdate('users', fields, 'telegram_id = $N', [tid]);
  const user = await queryOne(
    `${text} RETURNING notification_enabled, reminder_time, timezone`,
    values
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
