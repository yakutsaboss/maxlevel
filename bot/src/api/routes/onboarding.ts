import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

const router = Router();

/**
 * GET /api/onboarding/:telegramId
 * Get onboarding state for a user
 */
router.get('/:telegramId', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = parseInt(req.params.telegramId);

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
  const telegramId = parseInt(req.params.telegramId);

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
  const tid = parseInt(req.params.telegramId);
  const { quiz_data } = req.body;

  if (!quiz_data || !quiz_data.selected_modes) {
    throw new BadRequestError('Missing quiz_data or selected_modes');
  }

  // 0. Look up user id first
  const userLookup = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [tid]);
  if (!userLookup) {
    throw new NotFoundError('User not found');
  }
  const userId = userLookup.id;

  // 1. Add selected modes (native SQL — migrated from mode_manager.py)
  for (const modeName of quiz_data.selected_modes) {
    const mode = await queryOne('SELECT id FROM modes WHERE name = $1', [modeName]);
    if (!mode) continue;

    const existing = await queryOne(
      'SELECT id, is_active FROM user_modes WHERE user_id = $1 AND mode_id = $2',
      [userId, mode.id]
    );

    if (existing) {
      if (!existing.is_active) {
        await execute(
          'UPDATE user_modes SET is_active = true, enabled_at = NOW() WHERE id = $1',
          [existing.id]
        );
      }
    } else {
      await execute(
        'INSERT INTO user_modes (user_id, mode_id, is_active) VALUES ($1, $2, true)',
        [userId, mode.id]
      );
    }

    // Initialize streak for this mode
    await execute(
      'INSERT INTO streaks (user_id, mode_id, current_streak, longest_streak) VALUES ($1, $2, 0, 0) ON CONFLICT (user_id, mode_id) DO NOTHING',
      [userId, mode.id]
    );
  }

  // 2-5: All remaining steps in a single transaction
  await transaction(async (client) => {

    // 2. Save mode configs
    for (const modeName of quiz_data.selected_modes) {
      const modeQuizData = quiz_data[modeName] || {};
      const painPoints = quiz_data.pain_points?.[modeName] || {};

      console.log(`[ONBOARD] step 2: mode_configs for ${modeName}`);
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
    console.log(`[ONBOARD] step 3: punishment_settings`);
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

    // 4. Award 50 XP, reactivate user, and restore name from Telegram
    console.log(`[ONBOARD] step 4: update users`);
    const tgUser = (req as any).telegramUser;
    const restoreName = tgUser?.first_name || quiz_data.nickname || 'Player';
    const restoreUsername = tgUser?.username || null;
    await client.query(
      `UPDATE users SET total_xp = total_xp + 50,
       current_level = ((total_xp + 50) / 500) + 1,
       is_active = true,
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

    // 5. Mark onboarding as completed
    console.log(`[ONBOARD] step 5: mark completed`);
    await client.query(
      `UPDATE onboarding_state SET current_step = 'completed', last_updated = NOW()
       WHERE user_id = $1::int`,
      [userId]
    );
  });

  // 6. Assign initial daily quests (native SQL — migrated from quest_manager.py)
  const modeRows = await query(
    'SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const modeIds = modeRows.map((r: any) => r.mode_id);

  if (modeIds.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const available = await query(
      `SELECT id, difficulty FROM quests
       WHERE mode_id = ANY($1) AND quest_type = 'daily'
       AND id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
       ORDER BY RANDOM() LIMIT $4`,
      [modeIds, userId, today, 3]
    );

    const targetMap: Record<string, number> = { easy: 1, medium: 3, hard: 5 };
    for (const quest of available) {
      const target = targetMap[quest.difficulty] || 1;
      await execute(
        `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT (user_id, quest_id, instance_date) DO NOTHING`,
        [userId, quest.id, today, target]
      );
    }
  }

  res.json(successResponse({ xp_awarded: 50 }, 'Onboarding completed successfully'));
}));

export { router as onboardingRouter };
