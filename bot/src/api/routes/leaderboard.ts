import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';

const router = Router();

/**
 * GET /api/leaderboard
 * Returns leaderboard from materialized view.
 * Cached for 30 seconds — leaderboard doesn't change per-request.
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const entries = await cached(`leaderboard:${limit}`, TTL.SHORT, () =>
      query(
        `SELECT user_id, telegram_id, username, first_name, current_level, total_xp,
                best_current_streak, total_quests_completed, xp_rank, level_rank
         FROM leaderboard_mv
         ORDER BY xp_rank ASC
         LIMIT $1`,
        [limit]
      )
    );

    const formatted = entries.map((row: any) => ({
      user_id: row.user_id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      level: row.current_level,
      total_xp: row.total_xp,
      current_streak: parseInt(row.best_current_streak) || 0,
      total_quests_completed: parseInt(row.total_quests_completed) || 0,
      xp_rank: parseInt(row.xp_rank) || 0,
      level_rank: parseInt(row.level_rank) || 0,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRouter };
