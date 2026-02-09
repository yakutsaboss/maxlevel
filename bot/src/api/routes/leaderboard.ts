import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';

const router = Router();

/**
 * GET /api/leaderboard
 * Returns leaderboard using direct query (no materialized view).
 * Cached for 30 seconds — leaderboard doesn't change per-request.
 * Optional ?mode=fitness|hydration|finance|learning to filter by mode.
 */
router.get('/', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const mode = req.query.mode as string | undefined;

    if (mode) {
      // Mode-filtered leaderboard: rank by mode-specific XP and streaks
      const cacheKey = `leaderboard:mode:${mode}:${limit}`;
      const entries = await cached(cacheKey, TTL.SHORT, () =>
        query(
          `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
                  u.current_level, u.total_xp,
                  COALESCE(s.current_streak, 0)::int AS mode_streak,
                  COALESCE(qi.mode_xp, 0)::int AS mode_xp,
                  COALESCE(qi.mode_quests, 0)::int AS mode_quests_completed,
                  ROW_NUMBER() OVER (ORDER BY COALESCE(qi.mode_xp, 0) DESC) AS xp_rank
           FROM users u
           JOIN user_modes um ON um.user_id = u.id AND um.is_active = true
           JOIN modes m ON m.id = um.mode_id AND m.name = $2
           LEFT JOIN (
             SELECT s.user_id, s.current_streak
             FROM streaks s
             JOIN modes m ON m.id = s.mode_id AND m.name = $2
           ) s ON s.user_id = u.id
           LEFT JOIN (
             SELECT qi.user_id,
                    SUM(qi.xp_awarded)::int AS mode_xp,
                    COUNT(*)::int AS mode_quests
             FROM quest_instances qi
             JOIN quests q ON q.id = qi.quest_id
             JOIN modes m ON m.id = q.mode_id AND m.name = $2
             WHERE qi.status = 'completed'
             GROUP BY qi.user_id
           ) qi ON qi.user_id = u.id
           WHERE u.is_active = true
           ORDER BY COALESCE(qi.mode_xp, 0) DESC
           LIMIT $1`,
          [limit, mode]
        )
      );

      const formatted = entries.map((row: any) => ({
        user_id: row.user_id,
        telegram_id: row.telegram_id,
        username: row.username,
        first_name: row.first_name,
        level: row.current_level,
        total_xp: row.total_xp,
        mode_xp: row.mode_xp,
        mode_streak: row.mode_streak,
        mode_quests_completed: row.mode_quests_completed,
        xp_rank: parseInt(row.xp_rank) || 0,
      }));

      return res.json({ success: true, mode, data: formatted });
    }

    // Default cross-mode leaderboard
    const entries = await cached(`leaderboard:${limit}`, TTL.SHORT, () =>
      query(
        `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
                u.current_level, u.total_xp,
                COALESCE(s.best_streak, 0) AS best_current_streak,
                COALESCE(qi.total_completed, 0) AS total_quests_completed,
                ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) AS xp_rank,
                ROW_NUMBER() OVER (ORDER BY u.current_level DESC, u.total_xp DESC) AS level_rank
         FROM users u
         LEFT JOIN (
           SELECT user_id, MAX(current_streak) AS best_streak
           FROM streaks GROUP BY user_id
         ) s ON s.user_id = u.id
         LEFT JOIN (
           SELECT user_id, COUNT(*)::int AS total_completed
           FROM quest_instances WHERE status = 'completed'
           GROUP BY user_id
         ) qi ON qi.user_id = u.id
         WHERE u.is_active = true
         ORDER BY u.total_xp DESC
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

/**
 * GET /api/leaderboard/weekly
 * Returns leaderboard ranked by XP earned in the last 7 days.
 * Cached for 5 minutes.
 */
router.get('/weekly', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const entries = await cached(`leaderboard:weekly:${limit}`, 300, () =>
      query(
        `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
                u.current_level, u.total_xp,
                COALESCE(SUM(qi.xp_awarded), 0)::int AS weekly_xp
         FROM users u
         LEFT JOIN quest_instances qi
           ON qi.user_id = u.id
           AND qi.status = 'completed'
           AND qi.completed_at > NOW() - INTERVAL '7 days'
         WHERE u.is_active = true
         GROUP BY u.id
         HAVING COALESCE(SUM(qi.xp_awarded), 0) > 0
         ORDER BY weekly_xp DESC
         LIMIT $1`,
        [limit]
      )
    );

    const formatted = entries.map((row: any, index: number) => ({
      user_id: row.user_id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      level: row.current_level,
      total_xp: row.total_xp,
      weekly_xp: row.weekly_xp,
      rank: index + 1,
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch weekly leaderboard' });
  }
});

export { router as leaderboardRouter };
