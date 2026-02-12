import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
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
router.get('/users/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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
router.get('/users/:userId/summary', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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
router.post('/users/:userId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);
  const { modes } = req.body;

  if (!modes || !Array.isArray(modes) || modes.length === 0) {
    throw new BadRequestError('Invalid modes array');
  }

  const added: { mode: string; user_mode_id: number }[] = [];
  const failed: { mode: string; reason: string }[] = [];
  const already_active: string[] = [];

  // Normalize mode names
  const modeNames = modes.map((m: string) => String(m).trim());

  // Batch 1: Fetch ALL requested modes in one query
  const allModes = await query<{ id: number; name: string }>(
    `SELECT id, name FROM modes WHERE name = ANY($1::text[])`,
    [modeNames]
  );
  const modeMap = new Map(allModes.map(m => [m.name, m.id]));

  // Identify modes not found
  for (const modeName of modeNames) {
    if (!modeMap.has(modeName)) {
      failed.push({ mode: modeName, reason: 'Mode not found' });
    }
  }

  const foundModeIds = [...modeMap.values()];
  if (foundModeIds.length === 0) {
    res.json(successResponse({ message: 'Modes added successfully', added, failed, already_active }));
    return;
  }

  // Batch 2: Fetch ALL existing user_modes for this user + requested modes in one query
  const existingUserModes = await query<{ id: number; mode_id: number; is_active: boolean }>(
    `SELECT id, mode_id, is_active FROM user_modes WHERE user_id = $1 AND mode_id = ANY($2::int[])`,
    [userId, foundModeIds]
  );
  const existingMap = new Map(existingUserModes.map(um => [um.mode_id, um]));

  // Categorize: reactivate, insert new, or skip already active
  const toReactivateIds: number[] = [];
  const toInsert: { modeName: string; modeId: number }[] = [];

  for (const modeName of modeNames) {
    const modeId = modeMap.get(modeName);
    if (modeId === undefined) continue; // already in failed

    const existing = existingMap.get(modeId);
    if (existing && existing.is_active) {
      already_active.push(modeName);
    } else if (existing && !existing.is_active) {
      toReactivateIds.push(existing.id);
      added.push({ mode: modeName, user_mode_id: existing.id });
    } else {
      toInsert.push({ modeName, modeId });
    }
  }

  // Batch 3: Reactivate inactive user_modes in one UPDATE
  if (toReactivateIds.length > 0) {
    await execute(
      `UPDATE user_modes SET is_active = true, enabled_at = NOW() WHERE id = ANY($1::int[])`,
      [toReactivateIds]
    );
  }

  // Batch 4: Insert new user_modes in one multi-row INSERT
  if (toInsert.length > 0) {
    const values: unknown[] = [];
    const placeholders: string[] = [];
    toInsert.forEach((item, i) => {
      const offset = i * 2;
      placeholders.push(`($${offset + 1}, $${offset + 2}, true)`);
      values.push(userId, item.modeId);
    });
    const inserted = await query<{ id: number; mode_id: number }>(
      `INSERT INTO user_modes (user_id, mode_id, is_active)
       VALUES ${placeholders.join(', ')}
       RETURNING id, mode_id`,
      values
    );
    const insertedMap = new Map(inserted.map(r => [r.mode_id, r.id]));
    for (const item of toInsert) {
      added.push({ mode: item.modeName, user_mode_id: insertedMap.get(item.modeId)! });
    }
  }

  // Batch 5: Upsert streaks for all modes that were added (reactivated + new)
  const allAddedModeIds = added.map(a => modeMap.get(a.mode)!).filter(Boolean);
  if (allAddedModeIds.length > 0) {
    const streakValues: unknown[] = [];
    const streakPlaceholders: string[] = [];
    allAddedModeIds.forEach((modeId, i) => {
      const offset = i * 2;
      streakPlaceholders.push(`($${offset + 1}, $${offset + 2}, 0, 0)`);
      streakValues.push(userId, modeId);
    });
    await execute(
      `INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak)
       VALUES ${streakPlaceholders.join(', ')}
       ON CONFLICT (user_id, mode_id) DO NOTHING`,
      streakValues
    );
  }

  res.json(successResponse({ message: 'Modes added successfully', added, failed, already_active }));
}));

/**
 * DELETE /api/users/:userId/modes/:modeId
 */
router.delete('/users/:userId/:modeId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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
router.patch('/users/:userId/:modeId', authenticateTelegram, authorizeUser, asyncHandler(async (req: Request, res: Response) => {
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
