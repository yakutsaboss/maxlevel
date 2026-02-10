import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, transaction } from '../../utils/db.js';
import { invalidateUserCache } from '../../utils/cache.js';

const router = Router();

/**
 * POST /api/checkins
 * Create a check-in for a quest instance.
 * Increments quest_instances.check_in_count and auto-completes if target reached.
 */
router.post('/', authenticateTelegram, mutationLimiter, async (req: Request, res: Response) => {
  try {
    const { telegram_id, quest_instance_id, notes } = req.body;

    if (!telegram_id || !quest_instance_id) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'telegram_id and quest_instance_id are required',
      });
    }

    // Fetch quest instance with user verification
    const quest = await queryOne(
      `SELECT qi.id, qi.user_id, qi.status, qi.check_in_count,
              q.xp_reward, q.title, qi.target
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       JOIN users u ON qi.user_id = u.id
       WHERE qi.id = $1 AND u.telegram_id = $2`,
      [quest_instance_id, telegram_id]
    );

    if (!quest) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Quest instance not found or does not belong to this user',
      });
    }

    if (quest.status === 'completed') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Quest is already completed',
      });
    }

    const newCount = (quest.check_in_count || 0) + 1;
    const target = quest.target || 1;
    const completed = newCount >= target;

    const result = await transaction(async (client) => {
      // Insert check-in record
      const checkInResult = await client.query(
        `INSERT INTO check_ins (quest_instance_id, notes)
         VALUES ($1, $2)
         RETURNING id, check_in_time`,
        [quest_instance_id, notes || null]
      );

      if (completed) {
        // Auto-complete: update progress + status + award XP
        await client.query(
          `UPDATE quest_instances
           SET check_in_count = $1, status = 'completed', completed_at = NOW(), xp_awarded = $2
           WHERE id = $3`,
          [newCount, quest.xp_reward, quest_instance_id]
        );
        await client.query(
          `UPDATE users SET total_xp = total_xp + $1, current_level = ((total_xp + $1) / 500) + 1
           WHERE id = $2`,
          [quest.xp_reward, quest.user_id]
        );
      } else {
        // Just increment check-in count
        await client.query(
          `UPDATE quest_instances SET check_in_count = $1 WHERE id = $2`,
          [newCount, quest_instance_id]
        );
      }

      return {
        check_in_id: checkInResult.rows[0].id,
        check_in_time: checkInResult.rows[0].check_in_time,
      };
    });

    invalidateUserCache(quest.user_id);

    res.json({
      success: true,
      data: {
        check_in_id: result.check_in_id,
        quest_progress: { current: newCount, target },
        completed,
      },
    });
  } catch (error) {
    console.error('Error creating check-in:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to create check-in',
    });
  }
});

/**
 * GET /api/checkins/:telegramId/today
 * Get today's check-ins for a user.
 */
router.get('/:telegramId/today', authenticateTelegram, readLimiter, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);

    if (isNaN(telegramId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid telegram ID',
      });
    }

    const rows = await query(
      `SELECT ci.id, ci.check_in_time, ci.notes, ci.is_valid,
              q.title AS quest_title, qi.status AS quest_status
       FROM check_ins ci
       JOIN quest_instances qi ON ci.quest_instance_id = qi.id
       JOIN quests q ON qi.quest_id = q.id
       JOIN users u ON qi.user_id = u.id
       WHERE u.telegram_id = $1
         AND ci.check_in_time::date = CURRENT_DATE
       ORDER BY ci.check_in_time DESC`,
      [telegramId]
    );

    res.json({
      check_ins: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error('Error fetching today check-ins:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch check-ins',
    });
  }
});

/**
 * GET /api/checkins/:telegramId/history
 * Get paginated check-in history for a user.
 */
router.get('/:telegramId/history', authenticateTelegram, readLimiter, async (req: Request, res: Response) => {
  try {
    const telegramId = parseInt(req.params.telegramId);

    if (isNaN(telegramId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid telegram ID',
      });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = (page - 1) * limit;

    const rows = await query(
      `SELECT ci.id, ci.check_in_time, ci.notes, ci.is_valid,
              q.title AS quest_title, qi.status AS quest_status
       FROM check_ins ci
       JOIN quest_instances qi ON ci.quest_instance_id = qi.id
       JOIN quests q ON qi.quest_id = q.id
       JOIN users u ON qi.user_id = u.id
       WHERE u.telegram_id = $1
       ORDER BY ci.check_in_time DESC
       LIMIT $2 OFFSET $3`,
      [telegramId, limit, offset]
    );

    res.json({
      check_ins: rows,
      page,
      limit,
      count: rows.length,
    });
  } catch (error) {
    console.error('Error fetching check-in history:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch check-in history',
    });
  }
});

export { router as checkinRouter };
