import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne } from '../../utils/db.js';
import { updateStreak } from '../../utils/streak.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';
import { preferencesRouter } from './user-preferences.js';
import { statsRouter } from './user-stats.js';
import { accountRouter } from './user-account.js';

// Re-export resolveUser so any existing consumers don't break
export { resolveUser } from './user-helpers.js';

const router = Router();

// Mount sub-routers (paths are defined inside each sub-router)
router.use('/', statsRouter);
router.use('/', preferencesRouter);
router.use('/', accountRouter);

/**
 * POST /api/users
 * Create a new user (called from bot on /start)
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { telegramId, firstName, lastName, username } = req.body;

  validateRequired(req.body, ['telegramId', 'firstName']);

  const user = await queryOne(
    `INSERT INTO users (telegram_id, username, first_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_id) DO UPDATE SET
       username = COALESCE(EXCLUDED.username, users.username),
       first_name = COALESCE(EXCLUDED.first_name, users.first_name)
     RETURNING *`,
    [telegramId, username || null, firstName]
  );

  res.status(201).json(successResponse({ message: 'User created successfully', user }));
}));

/**
 * PATCH /api/users/:userId/xp
 */
router.patch('/:userId/xp', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    throw new BadRequestError('Invalid XP amount');
  }

  const user = await queryOne(
    `UPDATE users
     SET total_xp = total_xp + $1,
         current_level = ((total_xp + $1) / 500) + 1
     WHERE id = $2
     RETURNING total_xp, current_level`,
    [amount, userId]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(successResponse({
    message: 'XP added successfully',
    newTotal: user.total_xp,
    newLevel: user.current_level,
    leveledUp: false,
  }));
}));

/**
 * PATCH /api/users/:userId/streak
 */
router.patch('/:userId/streak', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const uid = safeParseInt(req.params.userId, 0);
  if (isNaN(uid)) {
    throw new BadRequestError('Invalid user ID');
  }

  const streaks = await query<{ user_id: number; mode_id: number }>('SELECT user_id, mode_id FROM streaks WHERE user_id = $1', [uid]);

  await Promise.all(streaks.map(s => updateStreak(s.user_id, s.mode_id)));

  // Re-fetch to get updated values
  const updated = await query<{ current_streak: number }>('SELECT current_streak FROM streaks WHERE user_id = $1', [uid]);
  const maxStreak = Math.max(0, ...updated.map((s) => s.current_streak));

  res.json(successResponse({ message: 'Streaks updated', current_streak: maxStreak }));
}));

export { router as userRouter };
