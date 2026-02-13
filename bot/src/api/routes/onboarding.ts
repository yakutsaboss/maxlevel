import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { awardXp } from '../../utils/xpAward.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

/**
 * GET /api/onboarding/:telegramId
 * Get onboarding state for a user
 */
router.get('/:telegramId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);

  const state = await queryOne(
    `SELECT os.current_step, os.quiz_data, os.last_updated
     FROM onboarding_state os
     JOIN users u ON u.id = os.user_id
     WHERE u.telegram_id = $1
     LIMIT 1`,
    [telegramId]
  );

  res.json(successResponse(state || { current_step: null, quiz_data: null }));
}));

/**
 * PUT /api/onboarding/:telegramId
 * Save/update onboarding state
 */
router.put('/:telegramId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);

  validateRequired(req.body, ['current_step']);

  const { current_step, quiz_data } = req.body;
  const quizDataJson = JSON.stringify(quiz_data || {});

  const row = await queryOne(
    `INSERT INTO onboarding_state (user_id, current_step, quiz_data, last_updated)
     SELECT u.id, $1, $2::jsonb, NOW()
     FROM users u WHERE u.telegram_id = $3
     ON CONFLICT (user_id)
     DO UPDATE SET
       current_step = EXCLUDED.current_step,
       quiz_data = EXCLUDED.quiz_data,
       last_updated = NOW()
     RETURNING current_step, quiz_data`,
    [current_step, quizDataJson, telegramId]
  );

  res.json(successResponse(row));
}));

/**
 * POST /api/onboarding/:telegramId/complete
 * Complete onboarding — commits all data in a single transaction.
 */
router.post('/:telegramId/complete', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const tid = safeParseInt(req.params.telegramId, 0);
  requireOwnership(req);
  const { quiz_data } = req.body;

  if (!quiz_data || !quiz_data.selected_modes) {
    throw new BadRequestError('Missing quiz_data or selected_modes');
  }

  // 0. Look up user id first
  const userLookup = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [tid]);
  if (!userLookup) {
    throw new NotFoundError('User not found');
  }
  const userId = userLookup.id;

  // Idempotency guard: if onboarding already completed, return early
  const existingState = await queryOne<{ current_step: string }>(
    'SELECT current_step FROM onboarding_state WHERE user_id = $1',
    [userId]
  );
  if (existingState?.current_step === 'completed') {
    res.json(successResponse({ xp_awarded: 0, already_completed: true }));
    return;
  }

  // All steps in a single transaction for atomicity
  await transaction(async (client) => {

    // 1. Add selected modes (native SQL — migrated from mode_manager.py)
    for (const modeName of quiz_data.selected_modes) {
      const modeResult = await client.query('SELECT id FROM modes WHERE name = $1', [modeName]);
      const mode = modeResult.rows[0];
      if (!mode) continue;

      const existingResult = await client.query(
        'SELECT id, is_active FROM user_modes WHERE user_id = $1 AND mode_id = $2',
        [userId, mode.id]
      );
      const existing = existingResult.rows[0];

      if (existing) {
        if (!existing.is_active) {
          await client.query(
            'UPDATE user_modes SET is_active = true, enabled_at = NOW() WHERE id = $1',
            [existing.id]
          );
        }
      } else {
        await client.query(
          'INSERT INTO user_modes (user_id, mode_id, is_active) VALUES ($1, $2, true)',
          [userId, mode.id]
        );
      }

      // Initialize streak for this mode
      await client.query(
        'INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak) VALUES ($1, $2, 0, 0) ON CONFLICT (user_id, mode_id) DO NOTHING',
        [userId, mode.id]
      );
    }

    // 2. Save mode configs
    for (const modeName of quiz_data.selected_modes) {
      const modeQuizData = quiz_data[modeName] || {};
      const painPoints = quiz_data.pain_points?.[modeName] || {};

      await client.query(
        `INSERT INTO mode_configs (user_id, mode_id, quiz_responses, pain_points, created_at, updated_at)
         SELECT $1::int, m.id, $2::jsonb, $3::jsonb, NOW(), NOW()
         FROM modes m WHERE m.name = $4::text
         ON CONFLICT (user_id, mode_id)
         DO UPDATE SET
           quiz_responses = EXCLUDED.quiz_responses,
           pain_points = EXCLUDED.pain_points,
           updated_at = NOW()`,
        [userId, JSON.stringify(modeQuizData), JSON.stringify(painPoints), modeName]
      );
    }

    // 3. Save punishment settings
    if (quiz_data.punishments) {
      const p = quiz_data.punishments;
      // Frontend uses easy/hard, DB constraint expects low/high
      const intensityMap: Record<string, string> = { easy: 'low', hard: 'high' };
      const intensity = intensityMap[p.intensity_level] || p.intensity_level || 'low';
      const consentTs = p.consent_given ? new Date().toISOString() : null;
      await client.query(
        `INSERT INTO punishment_settings (user_id, consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments)
         VALUES ($1::int, $2::boolean, $3::timestamptz, $4::varchar, $5::boolean, $6::jsonb)
         ON CONFLICT (user_id)
         DO UPDATE SET
           consent_given = EXCLUDED.consent_given,
           consent_timestamp = EXCLUDED.consent_timestamp,
           intensity_level = EXCLUDED.intensity_level,
           safe_mode = EXCLUDED.safe_mode,
           custom_punishments = EXCLUDED.custom_punishments`,
        [userId, !!p.consent_given, consentTs, intensity, p.safe_mode !== false, JSON.stringify(p.custom_punishments || {})]
      );
    }

    // 4. Award 50 XP (via centralized awardXp), reactivate user, restore name
    const tgUser = req.telegramUser;
    const restoreName = tgUser?.first_name || quiz_data.nickname || 'Player';
    const restoreUsername = tgUser?.username || null;
    await awardXp(client, userId, 50);
    await client.query(
      `UPDATE users SET is_active = true,
       first_name = CASE WHEN first_name = 'Deleted User' THEN $2::text ELSE first_name END
       WHERE id = $1::int`,
      [userId, restoreName]
    );
    if (restoreUsername) {
      await client.query(
        `UPDATE users SET username = $2::text WHERE id = $1::int AND username IS NULL`,
        [userId, restoreUsername]
      );
    }

    // 4b. Save avatar selection from onboarding
    if (quiz_data.gender) {
      const avatarMap: Record<string, number> = {
        'gym_warrior': 1,
        'office_boss': 2,
        'magic_pet': 3,
        'night_owl': 4,
        'couch_hero': 5,
      };
      const avatarId = avatarMap[quiz_data.gender] || 1;
      await client.query(
        'UPDATE users SET avatar_id = $1 WHERE id = $2',
        [avatarId, userId]
      );
    }

    // 4c. Save nickname if provided during onboarding
    if (quiz_data.nickname) {
      await client.query(
        'UPDATE users SET first_name = $1 WHERE id = $2',
        [quiz_data.nickname.trim().substring(0, 100), userId]
      );
    }

    // 5. Mark onboarding as completed (UPSERT handles missing row)
    await client.query(
      `INSERT INTO onboarding_state (user_id, current_step, last_updated)
       VALUES ($1::int, 'completed', NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET current_step = 'completed', last_updated = NOW()`,
      [userId]
    );

    // 6. Assign initial daily quests (native SQL — migrated from quest_manager.py)
    const modeRowsResult = await client.query<{ mode_id: number }>(
      'SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true',
      [userId]
    );
    const modeIds = modeRowsResult.rows.map((r) => r.mode_id);

    if (modeIds.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const availableResult = await client.query<{ id: number; difficulty: string }>(
        `SELECT id, difficulty FROM quests
         WHERE mode_id = ANY($1) AND quest_type = 'daily'
         AND id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
         ORDER BY RANDOM() LIMIT $4`,
        [modeIds, userId, today, 3]
      );

      const targetMap: Record<string, number> = { easy: 1, medium: 3, hard: 5 };
      for (const quest of availableResult.rows) {
        const target = targetMap[quest.difficulty] || 1;
        await client.query(
          `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (user_id, quest_id, instance_date) DO NOTHING`,
          [userId, quest.id, today, target]
        );
      }
    }
  });

  res.json(successResponse({ xp_awarded: 50 }, 'Onboarding completed successfully'));
}));

export { router as onboardingRouter };
