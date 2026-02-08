import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { executePythonTool } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/onboarding/:telegramId
 * Get onboarding state for a user
 */
router.get('/:telegramId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;

    const result = await executePythonTool('db_operations', [
      '--query',
      `SELECT os.current_step, os.quiz_data, os.last_updated
       FROM onboarding_state os
       JOIN users u ON u.id = os.user_id
       WHERE u.telegram_id = ${parseInt(telegramId)}
       LIMIT 1`
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch onboarding state',
      });
    }

    const state = result.data && result.data[0];

    res.json({
      success: true,
      data: state || { current_step: null, quiz_data: null },
    });
  } catch (error) {
    console.error('Error fetching onboarding state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch onboarding state',
    });
  }
});

/**
 * PUT /api/onboarding/:telegramId
 * Save/update onboarding state
 */
router.put('/:telegramId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const { current_step, quiz_data } = req.body;

    if (!current_step) {
      return res.status(400).json({
        success: false,
        error: 'Missing current_step',
      });
    }

    const quizDataJson = JSON.stringify(quiz_data || {}).replace(/'/g, "''");

    const result = await executePythonTool('db_operations', [
      '--query',
      `INSERT INTO onboarding_state (user_id, current_step, quiz_data, last_updated)
       SELECT u.id, '${current_step}', '${quizDataJson}'::jsonb, NOW()
       FROM users u WHERE u.telegram_id = ${parseInt(telegramId)}
       ON CONFLICT (user_id)
       DO UPDATE SET
         current_step = EXCLUDED.current_step,
         quiz_data = EXCLUDED.quiz_data,
         last_updated = NOW()
       RETURNING current_step, quiz_data`
    ]);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to save onboarding state',
      });
    }

    res.json({
      success: true,
      data: result.data && result.data[0],
    });
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save onboarding state',
    });
  }
});

/**
 * POST /api/onboarding/:telegramId/complete
 * Complete onboarding - commits all data to proper tables
 */
router.post('/:telegramId/complete', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const { quiz_data } = req.body;

    if (!quiz_data || !quiz_data.selected_modes) {
      return res.status(400).json({
        success: false,
        error: 'Missing quiz_data or selected_modes',
      });
    }

    const tid = parseInt(telegramId);

    // 1. Add selected modes to user_modes
    const modesString = quiz_data.selected_modes.join(',');
    await executePythonTool('mode_manager', [
      '--add-modes',
      '--telegram-id', String(tid),
      '--modes', modesString,
    ]);

    // 2. Save mode configs (quiz responses per mode)
    for (const modeName of quiz_data.selected_modes) {
      const modeQuizData = quiz_data[modeName] || {};
      const painPoints = quiz_data.pain_points?.[modeName] || {};
      const quizJson = JSON.stringify(modeQuizData).replace(/'/g, "''");
      const painJson = JSON.stringify(painPoints).replace(/'/g, "''");

      await executePythonTool('db_operations', [
        '--query',
        `INSERT INTO mode_configs (user_id, mode_id, quiz_responses, pain_points, created_at, updated_at)
         SELECT u.id, m.id, '${quizJson}'::jsonb, '${painJson}'::jsonb, NOW(), NOW()
         FROM users u, modes m
         WHERE u.telegram_id = ${tid} AND m.name = '${modeName}'
         ON CONFLICT (user_id, mode_id)
         DO UPDATE SET
           quiz_responses = EXCLUDED.quiz_responses,
           pain_points = EXCLUDED.pain_points,
           updated_at = NOW()`
      ]);
    }

    // 3. Save punishment settings
    if (quiz_data.punishments) {
      const p = quiz_data.punishments;
      const customJson = JSON.stringify(p.custom_punishments || {}).replace(/'/g, "''");

      await executePythonTool('db_operations', [
        '--query',
        `INSERT INTO punishment_settings (user_id, consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments)
         SELECT u.id, ${p.consent_given || false}, ${p.consent_given ? 'NOW()' : 'NULL'},
                '${p.intensity_level || 'low'}', ${p.safe_mode !== false}, '${customJson}'::jsonb
         FROM users u WHERE u.telegram_id = ${tid}
         ON CONFLICT (user_id)
         DO UPDATE SET
           consent_given = EXCLUDED.consent_given,
           consent_timestamp = EXCLUDED.consent_timestamp,
           intensity_level = EXCLUDED.intensity_level,
           safe_mode = EXCLUDED.safe_mode,
           custom_punishments = EXCLUDED.custom_punishments`
      ]);
    }

    // 4. Award 50 XP for completing onboarding
    await executePythonTool('db_operations', [
      '--query',
      `UPDATE users SET total_xp = total_xp + 50,
       current_level = ((total_xp + 50) / 500) + 1
       WHERE telegram_id = ${tid}`
    ]);

    // 5. Mark onboarding as completed
    await executePythonTool('db_operations', [
      '--query',
      `UPDATE onboarding_state SET current_step = 'completed', last_updated = NOW()
       WHERE user_id = (SELECT id FROM users WHERE telegram_id = ${tid})`
    ]);

    // 6. Assign initial quests
    await executePythonTool('quest_manager', [
      '--assign-daily',
      '--telegram-id', String(tid),
      '--count', '3',
    ]);

    res.json({
      success: true,
      message: 'Onboarding completed successfully',
      data: { xp_awarded: 50 },
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete onboarding',
    });
  }
});

export { router as onboardingRouter };
