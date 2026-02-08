import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { executeSafeQuery } from '../../utils/pythonTools.js';

const router = Router();

/**
 * GET /api/leaderboard
 * Returns leaderboard from materialized view
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const result = await executeSafeQuery(
      `SELECT user_id, telegram_id, username, first_name, current_level, total_xp,
              best_current_streak, total_quests_completed, xp_rank, level_rank
       FROM leaderboard_mv
       ORDER BY xp_rank ASC
       LIMIT %s`,
      [Math.min(limit, 100)]
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
    }

    const entries = (result.data || []).map((row: any) => ({
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

    res.json({ success: true, data: entries });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
});

export { router as leaderboardRouter };
