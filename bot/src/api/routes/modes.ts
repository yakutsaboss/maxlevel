import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import { executePythonTool } from '../../utils/pythonTools.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  InternalServerError,
} from '../utils/errors.js';

const router = Router();

/**
 * GET /api/modes
 * Get all available modes. Cached — modes almost never change.
 */
router.get('/', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const modes = await cached('modes:all', TTL.MEDIUM, () =>
    query(`SELECT id, name, display_name, description, icon_emoji AS icon FROM modes ORDER BY id`)
  );

  res.json(successResponse({ modes, count: modes.length }));
}));

/**
 * GET /api/users/:userId/modes
 * Get user's active modes
 */
router.get('/users/:userId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const rows = await query(
    `SELECT um.id, um.user_id, um.mode_id, um.is_active, um.enabled_at,
            m.name, m.display_name, m.description, m.icon_emoji AS icon
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     WHERE um.user_id = $1 AND um.is_active = true`,
    [userId]
  );

  res.json(successResponse({ modes: rows, count: rows.length }));
}));

/**
 * GET /api/users/:userId/modes/summary
 * Get mode summary with quest counts
 */
router.get('/users/:userId/summary', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

  const rows = await query(
    `SELECT m.id, m.name, m.display_name, m.icon_emoji AS icon,
            COALESCE(qi_active.count, 0)::int AS active_quests,
            COALESCE(qi_done.count, 0)::int AS completed_quests
     FROM user_modes um
     JOIN modes m ON um.mode_id = m.id
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.user_id = $1 AND q.mode_id = m.id
         AND qi.status IN ('pending', 'ready', 'in_progress')
     ) qi_active ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS count FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.user_id = $1 AND q.mode_id = m.id AND qi.status = 'completed'
     ) qi_done ON true
     WHERE um.user_id = $1 AND um.is_active = true`,
    [userId]
  );

  res.json(successResponse({ summary: rows }));
}));

/**
 * POST /api/users/:userId/modes
 * Add modes to user
 */
router.post('/users/:userId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { modes } = req.body;

  if (!modes || !Array.isArray(modes) || modes.length === 0) {
    throw new BadRequestError('Invalid modes array');
  }

  const modesString = modes.join(',');
  const result = await executePythonTool('mode_manager', [
    '--add-modes', '--user-id', userId, '--modes', modesString
  ]);

  if (!result.success) {
    throw new InternalServerError('Failed to add modes');
  }

  res.json(successResponse({ message: 'Modes added successfully', modes: result.data || [] }));
}));

/**
 * DELETE /api/users/:userId/modes/:modeId
 */
router.delete('/users/:userId/:modeId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const modeId = parseInt(req.params.modeId);

  const affected = await execute(
    `UPDATE user_modes SET is_active = false WHERE user_id = $1 AND mode_id = $2`,
    [userId, modeId]
  );

  if (affected === 0) {
    throw new NotFoundError('Mode not found for user');
  }

  res.json(successResponse({ message: 'Mode removed successfully' }));
}));

/**
 * PATCH /api/users/:userId/modes/:modeId
 */
router.patch('/users/:userId/:modeId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const modeId = parseInt(req.params.modeId);
  const { settings } = req.body;

  if (!settings) {
    throw new BadRequestError('Missing settings object');
  }

  const row = await queryOne(
    `UPDATE user_modes
     SET settings = $1::jsonb
     WHERE user_id = $2 AND mode_id = $3
     RETURNING *`,
    [JSON.stringify(settings), userId, modeId]
  );

  if (!row) {
    throw new NotFoundError('Mode not found for user');
  }

  res.json(successResponse({ message: 'Mode settings updated successfully', settings: row.settings || settings }));
}));

/**
 * GET /api/modes/:modeId/quests
 * Get quest templates for a mode. Cached.
 */
router.get('/:modeId/quests', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const modeId = parseInt(req.params.modeId);

  const quests = await cached(`mode_quests:${modeId}`, TTL.MEDIUM, () =>
    query(
      `SELECT id, title AS name, description, xp_reward, quest_type AS frequency,
              difficulty, requires_timer, is_mandatory
       FROM quests
       WHERE mode_id = $1
       ORDER BY quest_type, difficulty`,
      [modeId]
    )
  );

  res.json(successResponse({ quests, count: quests.length }));
}));

export { router as modeRouter };
