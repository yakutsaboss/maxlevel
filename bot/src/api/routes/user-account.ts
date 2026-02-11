import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { queryOne, transaction } from '../../utils/db.js';
import { invalidatePrefix } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

const router = Router();

/**
 * PATCH /api/users/:telegramId/profile
 * Update user profile (first_name, avatar_id).
 */
router.patch('/:telegramId/profile', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = parseInt(req.params.telegramId);
  requireOwnership(req);
  if (isNaN(tid)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const { first_name, avatar_id } = req.body;

  // Validate fields
  if (first_name !== undefined) {
    if (typeof first_name !== 'string' || first_name.trim().length === 0 || first_name.trim().length > 32) {
      throw new BadRequestError('first_name must be 1-32 characters');
    }
  }
  if (avatar_id !== undefined) {
    const aid = parseInt(avatar_id);
    if (isNaN(aid) || aid < 1 || aid > 16) {
      throw new BadRequestError('avatar_id must be an integer 1-16');
    }
  }

  // Build SET clause dynamically
  const sets: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (first_name !== undefined) {
    sets.push(`first_name = $${idx++}`);
    params.push(first_name.trim());
  }
  if (avatar_id !== undefined) {
    sets.push(`avatar_id = $${idx++}`);
    params.push(parseInt(avatar_id));
  }

  if (sets.length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  params.push(tid);
  const user = await queryOne(
    `UPDATE users SET ${sets.join(', ')} WHERE telegram_id = $${idx} RETURNING id, telegram_id, username, first_name, avatar_id, current_level, total_xp, timezone`,
    params
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Invalidate cache for this user
  invalidatePrefix(`user:${user.id}:`);

  res.json(successResponse({
    id: user.id,
    telegram_id: user.telegram_id,
    username: user.username,
    first_name: user.first_name,
    avatar_id: user.avatar_id,
    level: user.current_level,
    xp: user.total_xp,
    timezone: user.timezone,
  }));
}));

/**
 * DELETE /api/users/:telegramId/account
 * Soft delete: deactivate account, anonymize PII, and wipe all progress data
 * so re-opening the mini app starts fresh onboarding.
 */
router.delete('/:telegramId/account', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = parseInt(req.params.telegramId);
  requireOwnership(req);
  if (isNaN(tid)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  // Look up user first
  const user = await queryOne(
    `SELECT id FROM users WHERE telegram_id = $1 AND is_active = true`,
    [tid]
  );

  if (!user) {
    throw new NotFoundError('User not found or already deleted');
  }

  const userId = user.id;

  // Wipe all user data in a single transaction.
  // Order matters: respect FK constraints (punishment_history -> quest_instances).
  await transaction(async (client) => {
    // 1. Delete onboarding state (forces re-onboarding on next open)
    await client.query('DELETE FROM onboarding_state WHERE user_id = $1', [userId]);

    // 2. Delete check-ins (references quest_instances)
    await client.query(
      `DELETE FROM check_ins WHERE quest_instance_id IN
       (SELECT id FROM quest_instances WHERE user_id = $1)`,
      [userId]
    );

    // 3. Delete punishment data (punishment_history references quest_instances via FK)
    await client.query('DELETE FROM punishment_history WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM punishment_settings WHERE user_id = $1', [userId]);

    // 4. Delete quest instances (now safe — no more FK refs)
    await client.query('DELETE FROM quest_instances WHERE user_id = $1', [userId]);

    // 5. Delete mode-related data
    await client.query('DELETE FROM mode_configs WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_modes WHERE user_id = $1', [userId]);

    // 6. Delete achievements
    await client.query('DELETE FROM user_achievements WHERE user_id = $1', [userId]);

    // 7. Delete activity log
    await client.query('DELETE FROM user_activity_log WHERE user_id = $1', [userId]);

    // 8. Delete streaks
    await client.query('DELETE FROM streaks WHERE user_id = $1', [userId]);

    // 8b. Delete reminders
    await client.query('DELETE FROM reminders WHERE user_id = $1', [userId]);

    // 9. Deactivate user and reset all progress
    await client.query(
      `UPDATE users
       SET is_active = false,
           first_name = 'Deleted User',
           username = NULL,
           timezone = 'UTC',
           total_xp = 0,
           current_level = 1,
           avatar_id = NULL
       WHERE id = $1`,
      [userId]
    );
  });

  // Invalidate cache for this user
  invalidatePrefix(`user:${user.id}:`);

  res.json(successResponse({ message: 'Account deleted successfully' }));
}));

export { router as accountRouter };
