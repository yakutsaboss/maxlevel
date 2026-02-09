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
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne } from '../../utils/db.js';

const router = Router();

/**
 * GET /api/punishment/:telegramId/settings
 * Returns the user's punishment settings (consent, intensity, safe mode, max penalties).
 */
router.get('/:telegramId/settings', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    if (isNaN(telegramId)) {
      res.status(400).json({ success: false, error: 'Invalid telegram ID' });
      return;
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
      res.json({ success: false, error: 'No settings found' });
      return;
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    console.error('Error fetching punishment settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch punishment settings' });
  }
});

/**
 * PATCH /api/punishment/:telegramId/settings
 * Update punishment settings. Only provided fields are updated.
 */
router.patch('/:telegramId/settings', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    if (isNaN(telegramId)) {
      res.status(400).json({ success: false, error: 'Invalid telegram ID' });
      return;
    }

    const { consent_given, intensity_level, safe_mode, custom_punishments } = req.body;

    // Validate intensity_level if provided
    if (intensity_level !== undefined) {
      const validLevels = ['low', 'medium', 'high', 'extreme'];
      if (!validLevels.includes(intensity_level)) {
        res.status(400).json({ success: false, error: 'Invalid intensity level. Must be: low, medium, high, or extreme' });
        return;
      }
    }

    // Get internal user_id from telegram_id
    const user = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Build dynamic SET clause for only provided fields
    const setClauses: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (consent_given !== undefined) {
      setClauses.push(`consent_given = $${paramIndex}`);
      params.push(consent_given);
      paramIndex++;

      // Update consent_timestamp when consent changes
      if (consent_given) {
        setClauses.push(`consent_timestamp = NOW()`);
      } else {
        setClauses.push(`consent_timestamp = NULL`);
      }
    }

    if (intensity_level !== undefined) {
      setClauses.push(`intensity_level = $${paramIndex}`);
      params.push(intensity_level);
      paramIndex++;
    }

    if (safe_mode !== undefined) {
      setClauses.push(`safe_mode = $${paramIndex}`);
      params.push(safe_mode);
      paramIndex++;
    }

    if (custom_punishments !== undefined) {
      setClauses.push(`custom_punishments = $${paramIndex}::jsonb`);
      params.push(JSON.stringify(custom_punishments));
      paramIndex++;
    }

    if (setClauses.length === 0) {
      res.status(400).json({ success: false, error: 'No fields to update' });
      return;
    }

    setClauses.push('updated_at = NOW()');
    params.push(user.id);

    const updated = await queryOne(
      `UPDATE punishment_settings
       SET ${setClauses.join(', ')}
       WHERE user_id = $${paramIndex}
       RETURNING consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments, max_xp_penalty, max_streak_reset`,
      params
    );

    if (!updated) {
      // No existing row — insert with defaults + provided values
      const insertResult = await queryOne(
        `INSERT INTO punishment_settings (user_id, consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments)
         VALUES ($1, $2, ${consent_given ? 'NOW()' : 'NULL'}, $3, $4, $5::jsonb)
         RETURNING consent_given, consent_timestamp, intensity_level, safe_mode, custom_punishments, max_xp_penalty, max_streak_reset`,
        [
          user.id,
          consent_given ?? false,
          intensity_level ?? 'medium',
          safe_mode ?? true,
          JSON.stringify(custom_punishments ?? {}),
        ]
      );
      res.json({ success: true, data: insertResult });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error updating punishment settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update punishment settings' });
  }
});

/**
 * GET /api/punishment/:telegramId/history
 * Paginated punishment history.
 * Query params: page (default 1), limit (default 20, max 100).
 */
router.get('/:telegramId/history', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);
    if (isNaN(telegramId)) {
      res.status(400).json({ success: false, error: 'Invalid telegram ID' });
      return;
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // Get user_id
    const user = await queryOne('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
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

    res.json({
      success: true,
      data: {
        punishments,
        page,
        total,
      },
    });
  } catch (error) {
    console.error('Error fetching punishment history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch punishment history' });
  }
});

export { router as punishmentRouter };
