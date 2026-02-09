import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { executePythonTool } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/onboarding/:telegramId
 * Get onboarding state for a user
 */
router.get('/:telegramId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);

    const state = await queryOne(
      `SELECT os.current_step, os.quiz_data, os.last_updated
       FROM onboarding_state os
       JOIN users u ON u.id = os.user_id
       WHERE u.telegram_id = $1
       LIMIT 1`,
      [telegramId]
    );

    res.json({
      success: true,
      data: state || { current_step: null, quiz_data: null },
    });
  } catch (error) {
    console.error('Error fetching onboarding state:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch onboarding state' });
  }
});

/**
 * PUT /api/onboarding/:telegramId
 * Save/update onboarding state
 */
router.put('/:telegramId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    const { current_step, quiz_data } = req.body;

    if (!current_step) {
      return res.status(400).json({ success: false, error: 'Missing current_step' });
    }

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

    res.json({ success: true, data: row });
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    res.status(500).json({ success: false, error: 'Failed to save onboarding state' });
  }
});

/**
 * POST /api/onboarding/:telegramId/complete
 * Complete onboarding — commits all data in a single transaction.
 */
router.post('/:telegramId/complete', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const tid = parseInt(req.params.telegramId);
    const { quiz_data } = req.body;

    if (!quiz_data || !quiz_data.selected_modes) {
      return res.status(400).json({ success: false, error: 'Missing quiz_data or selected_modes' });
    }

    // 0. Look up user id first (needed for Python tool calls)
    const userLookup = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [tid]);
    if (!userLookup) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    const userId = userLookup.id;

    // 1. Add selected modes (keep Python tool for complex logic)
    const modesString = quiz_data.selected_modes.join(',');
    await executePythonTool('mode_manager', [
      '--add-modes', '--user-id', String(userId), '--modes', modesString,
    ]);

    // 2-5: All remaining steps in a single transaction
    await transaction(async (client) => {

      // 2. Save mode configs
      for (const modeName of quiz_data.selected_modes) {
        const modeQuizData = quiz_data[modeName] || {};
        const painPoints = quiz_data.pain_points?.[modeName] || {};

        await client.query(
          `INSERT INTO mode_configs (user_id, mode_id, quiz_responses, pain_points, created_at, updated_at)
           SELECT $1, m.id, $2::jsonb, $3::jsonb, NOW(), NOW()
           FROM modes m WHERE m.name = $4
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
        await client.query(
          `INSERT INTO punishment_settings (user_id, consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments)
           VALUES ($1, $2, ${p.consent_given ? 'NOW()' : 'NULL'}, $3, $4, $5::jsonb)
           ON CONFLICT (user_id)
           DO UPDATE SET
             consent_given = EXCLUDED.consent_given,
             consent_timestamp = EXCLUDED.consent_timestamp,
             intensity_level = EXCLUDED.intensity_level,
             safe_mode = EXCLUDED.safe_mode,
             custom_punishments = EXCLUDED.custom_punishments`,
          [userId, p.consent_given || false, p.intensity_level || 'low', p.safe_mode !== false, JSON.stringify(p.custom_punishments || {})]
        );
      }

      // 4. Award 50 XP for completing onboarding
      await client.query(
        `UPDATE users SET total_xp = total_xp + 50,
         current_level = ((total_xp + 50) / 500) + 1
         WHERE id = $1`,
        [userId]
      );

      // 5. Mark onboarding as completed
      await client.query(
        `UPDATE onboarding_state SET current_step = 'completed', last_updated = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    });

    // 6. Assign initial quests (keep Python tool)
    await executePythonTool('quest_manager', [
      '--assign-daily', '--user-id', String(userId), '--count', '3',
    ]);

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: { xp_awarded: 50 },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
  }
});

export { router as onboardingRouter };
