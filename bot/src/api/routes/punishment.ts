/**
 * Punishment API Routes
 * Manages user punishment settings and punishment history.
 *
 * Routes:
 *   GET    /api/punishment/:telegramId/settings  — get punishment settings
 *   PATCH  /api/punishment/:telegramId/settings  — update punishment settings
 *   GET    /api/punishment/:telegramId/history    — paginated punishment history
 */

import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { PUNISHMENT_INTENSITY } from '../utils/constants.js';
import { buildDynamicUpdate } from '../../utils/sqlBuilder.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

/**
 * GET /api/punishment/:telegramId/settings
 * Returns the user's punishment settings (consent, intensity, safe mode, max penalties).
 */
router.get('/:telegramId/settings', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const settings = await queryOne(
    `SELECT ps.consent_given, ps.consent_timestamp, ps.intensity_level,
            ps.safe_mode, ps.custom_punishments, ps.max_xp_penalty, ps.max_streak_reset
     FROM punishment_settings ps
     JOIN users u ON u.id = ps.user_id
     WHERE u.telegram_id = $1`,
    [telegramId]
  );

  if (!settings) {
    throw new NotFoundError('No settings found');
  }

  res.json(successResponse(settings));
}));

/**
 * PATCH /api/punishment/:telegramId/settings
 * Update punishment settings. Only provided fields are updated.
 */
router.patch('/:telegramId/settings', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const { consent_given, intensity_level, safe_mode, custom_punishments } = req.body;

  // Validate intensity_level if provided
  if (intensity_level !== undefined) {
    const validLevels = Object.values(PUNISHMENT_INTENSITY);
    if (!validLevels.includes(intensity_level)) {
      throw new BadRequestError('Invalid intensity level. Must be: low, medium, high, or extreme');
    }
  }

  // Get internal user_id from telegram_id
  const user = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Build dynamic SET clause for only provided fields
  const fields: Record<string, unknown> = {};
  const extraClauses: string[] = [];

  if (consent_given !== undefined) {
    fields.consent_given = consent_given;
    // Update consent_timestamp when consent changes
    extraClauses.push(consent_given ? `consent_timestamp = NOW()` : `consent_timestamp = NULL`);
  }

  if (intensity_level !== undefined) {
    fields.intensity_level = intensity_level;
  }

  if (safe_mode !== undefined) {
    fields.safe_mode = safe_mode;
  }

  if (custom_punishments !== undefined) {
    if (!Array.isArray(custom_punishments)) {
      throw new BadRequestError('custom_punishments must be an array');
    }
    if (custom_punishments.length > 20) {
      throw new BadRequestError('Maximum 20 custom punishments allowed');
    }
    fields.custom_punishments = JSON.stringify(custom_punishments);
  }

  if (Object.keys(fields).length === 0 && extraClauses.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  extraClauses.push('updated_at = NOW()');

  const { text, values } = buildDynamicUpdate('punishment_settings', fields, 'user_id = $N', [user.id], {
    extraSetClauses: extraClauses,
    casts: custom_punishments !== undefined ? { custom_punishments: 'jsonb' } : {},
  });

  const updated = await queryOne(
    `${text}
     RETURNING consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments, max_xp_penalty, max_streak_reset`,
    values
  );

  if (!updated) {
    // No existing row — insert with defaults + provided values
    const insertResult = await queryOne(
      `INSERT INTO punishment_settings (user_id, consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments, max_xp_penalty, max_streak_reset`,
      [
        user.id,
        consent_given ?? false,
        consent_given ? new Date() : null,
        intensity_level ?? 'medium',
        safe_mode ?? true,
        JSON.stringify(custom_punishments ?? {}),
      ]
    );
    res.json(successResponse(insertResult));
    return;
  }

  res.json(successResponse(updated));
}));

/**
 * GET /api/punishment/:telegramId/history
 * Paginated punishment history.
 * Query params: page (default 1), limit (default 20, max 100).
 */
router.get('/:telegramId/history', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  if (telegramId === 0) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const page = Math.max(1, safeParseInt(req.query.page as string, 1));
  const limit = Math.min(100, Math.max(1, safeParseInt(req.query.limit as string, 20)));
  const offset = (page - 1) * limit;

  // Get user_id
  const user = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get total count
  const countResult = await queryOne(
    'SELECT COUNT(*)::int AS total FROM punishment_history WHERE user_id = $1',
    [user.id]
  );
  const total = countResult?.total ?? 0;

  // Get paginated history
  const punishments = await query(
    `SELECT ph.id, ph.quest_instance_id, ph.punishment_type, ph.severity,
            ph.xp_deducted, ph.streak_days_lost, ph.message_sent, ph.applied_at,
            q.title AS quest_title
     FROM punishment_history ph
     LEFT JOIN quest_instances qi ON qi.id = ph.quest_instance_id
     LEFT JOIN quests q ON q.id = qi.quest_id
     WHERE ph.user_id = $1
     ORDER BY ph.applied_at DESC
     LIMIT $2 OFFSET $3`,
    [user.id, limit, offset]
  );

  res.json(successResponse({
    punishments,
    page,
    total,
  }));
}));

export { router as punishmentRouter };
