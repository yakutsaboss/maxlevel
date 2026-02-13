import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import { asyncHandler, successResponse } from '../utils/errors.js';
import { questCompletionRouter } from './quest-completion.js';
import { questProgressRouter } from './quest-progress.js';
import { questAssignmentRouter } from './quest-assignment.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

// Mount sub-routers (all paths stay identical)
router.use('/', questCompletionRouter);
router.use('/', questProgressRouter);
router.use('/', questAssignmentRouter);

/**
 * GET /api/users/:userId/quests/active
 * Get all active quests for a user
 */
router.get('/users/:userId/active', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const quests = await query(
    `SELECT qi.id, qi.quest_id, q.title AS name, q.description, q.xp_reward,
            q.quest_type, q.difficulty, q.mode_id, m.name AS mode_name,
            m.icon_emoji AS mode_icon, qi.status, qi.instance_date,
            qi.check_in_count, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date ASC`,
    [userId]
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

/**
 * GET /api/users/:userId/quests/completed
 * Get completed quests for a user
 */
router.get('/users/:userId/completed', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const limit = safeParseInt(req.query.limit as string, 50);

  const quests = await query(
    `SELECT qi.id, q.title AS name, q.xp_reward, q.quest_type, q.difficulty,
            m.name AS mode_name, m.icon_emoji AS mode_icon,
            qi.xp_awarded, qi.completed_at, qi.target
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = $1 AND qi.status = 'completed'
     ORDER BY qi.completed_at DESC LIMIT $2`,
    [userId, limit]
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

/**
 * GET /api/users/:userId/quests/stats
 * Get quest statistics for a user
 */
router.get('/users/:userId/stats', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const [totalRow, activeRow, dailyRow, weeklyRow] = await Promise.all([
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status = 'completed'`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances WHERE user_id = $1 AND status IN ('pending', 'ready', 'in_progress')`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances qi JOIN quests q ON qi.quest_id = q.id WHERE qi.user_id = $1 AND qi.status = 'completed' AND q.quest_type = 'daily'`, [userId]),
    queryOne<{ total: number }>(`SELECT COUNT(*)::int AS total FROM quest_instances qi JOIN quests q ON qi.quest_id = q.id WHERE qi.user_id = $1 AND qi.status = 'completed' AND q.quest_type = 'weekly'`, [userId]),
  ]);

  res.json(successResponse({
    total_completed: totalRow?.total ?? 0,
    active_quests: activeRow?.total ?? 0,
    daily_completed: dailyRow?.total ?? 0,
    weekly_completed: weeklyRow?.total ?? 0,
  }));
}));

export { router as questRouter };
