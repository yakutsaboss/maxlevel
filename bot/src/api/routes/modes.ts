import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import { executePythonTool } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/modes
 * Get all available modes. Cached — modes almost never change.
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const modes = await cached('modes:all', TTL.MEDIUM, () =>
      query(`SELECT id, name, display_name, description, icon_emoji AS icon FROM modes ORDER BY id`)
    );

    res.json({ success: true, data: { modes, count: modes.length } });
  } catch (error) {
    console.error('Error fetching modes:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch modes' });
  }
});

/**
 * GET /api/users/:userId/modes
 * Get user's active modes
 */
router.get('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    const rows = await query(
      `SELECT um.id, um.user_id, um.mode_id, um.is_active, um.enabled_at,
              m.name, m.display_name, m.description, m.icon_emoji AS icon
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = $1 AND um.is_active = true`,
      [userId]
    );

    res.json({ success: true, data: { modes: rows, count: rows.length } });
  } catch (error) {
    console.error('Error fetching user modes:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch user modes' });
  }
});

/**
 * GET /api/users/:userId/modes/summary
 * Get mode summary with quest counts
 */
router.get('/users/:userId/summary', authenticateTelegram, async (req: Request, res: Response) => {
  try {
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

    res.json({ success: true, data: { summary: rows } });
  } catch (error) {
    console.error('Error fetching mode summary:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch mode summary' });
  }
});

/**
 * POST /api/users/:userId/modes
 * Add modes to user
 */
router.post('/users/:userId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { modes } = req.body;

    if (!modes || !Array.isArray(modes) || modes.length === 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid modes array' });
    }

    const modesString = modes.join(',');
    const result = await executePythonTool('mode_manager', [
      '--add-modes', '--user-id', userId, '--modes', modesString
    ]);

    if (!result.success) {
      return res.status(500).json({ error: 'Server Error', message: 'Failed to add modes' });
    }

    res.json({ success: true, data: { message: 'Modes added successfully', modes: result.data || [] } });
  } catch (error) {
    console.error('Error adding modes:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to add modes' });
  }
});

/**
 * DELETE /api/users/:userId/modes/:modeId
 */
router.delete('/users/:userId/:modeId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const modeId = parseInt(req.params.modeId);

    const affected = await execute(
      `UPDATE user_modes SET is_active = false WHERE user_id = $1 AND mode_id = $2`,
      [userId, modeId]
    );

    if (affected === 0) {
      return res.status(404).json({ error: 'Not Found', message: 'Mode not found for user' });
    }

    res.json({ success: true, data: { message: 'Mode removed successfully' } });
  } catch (error) {
    console.error('Error removing mode:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to remove mode' });
  }
});

/**
 * PATCH /api/users/:userId/modes/:modeId
 */
router.patch('/users/:userId/:modeId', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const modeId = parseInt(req.params.modeId);
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({ error: 'Bad Request', message: 'Missing settings object' });
    }

    const row = await queryOne(
      `UPDATE user_modes
       SET settings = $1::jsonb
       WHERE user_id = $2 AND mode_id = $3
       RETURNING *`,
      [JSON.stringify(settings), userId, modeId]
    );

    if (!row) {
      return res.status(404).json({ error: 'Not Found', message: 'Mode not found for user' });
    }

    res.json({ message: 'Mode settings updated successfully', settings: row.settings || settings });
  } catch (error) {
    console.error('Error updating mode settings:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update mode settings' });
  }
});

/**
 * GET /api/modes/:modeId/quests
 * Get quest templates for a mode. Cached.
 */
router.get('/:modeId/quests', authenticateTelegram, async (req: Request, res: Response) => {
  try {
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

    res.json({ quests, count: quests.length });
  } catch (error) {
    console.error('Error fetching mode quests:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to fetch mode quests' });
  }
});

export { router as modeRouter };
