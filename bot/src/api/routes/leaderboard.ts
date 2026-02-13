import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import { safeParseInt } from '../../utils/validation.js';
import {
  asyncHandler,
  successResponse,
} from '../utils/errors.js';

/** Row shape returned by leaderboard SQL queries. Optional fields vary by query type. */
type LeaderboardEntryRow = {
  user_id: number;
  telegram_id: string;
  username: string | null;
  first_name: string;
  current_level: number;
  total_xp: number;
  avatar_id?: number;
  // mode-filtered leaderboard
  mode_xp?: number;
  mode_streak?: number;
  mode_quests_completed?: number;
  // default cross-mode leaderboard
  best_current_streak?: string;
  total_quests_completed?: string;
  level_rank?: string;
  // weekly / monthly
  weekly_xp?: number;
  monthly_xp?: number;
  // common rank (ROW_NUMBER returns string from pg)
  xp_rank?: string;
};

const router = Router();

/**
 * GET /api/leaderboard
 * Returns leaderboard using direct query (no materialized view).
 * Cached for 30 seconds — leaderboard doesn't change per-request.
 * Optional ?mode=fitness|hydration|finance|learning to filter by mode.
 */
router.get('/', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(safeParseInt(req.query.limit as string | undefined, 50), 100);
  const mode = req.query.mode as string | undefined;

  if (mode) {
    // Mode-filtered leaderboard: rank by mode-specific XP and streaks
    const cacheKey = `leaderboard:mode:${mode}:${limit}`;
    const entries = await cached(cacheKey, TTL.SHORT, () =>
      query<LeaderboardEntryRow>(
        `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
                u.current_level, u.total_xp, u.avatar_id,
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

    const formatted = entries.map((row: LeaderboardEntryRow) => ({
      user_id: row.user_id,
      telegram_id: row.telegram_id,
      username: row.username,
      first_name: row.first_name,
      level: row.current_level,
      total_xp: row.total_xp,
      avatar_id: row.avatar_id ?? null,
      mode_xp: row.mode_xp,
      mode_streak: row.mode_streak,
      mode_quests_completed: row.mode_quests_completed,
      xp_rank: safeParseInt(row.xp_rank as string | undefined, 0),
    }));

    res.json({ ...successResponse(formatted), mode });
    return;
  }

  // Default cross-mode leaderboard
  const entries = await cached(`leaderboard:${limit}`, TTL.SHORT, () =>
    query<LeaderboardEntryRow>(
      `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
              u.current_level, u.total_xp, u.avatar_id,
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

  const formatted = entries.map((row: LeaderboardEntryRow) => ({
    user_id: row.user_id,
    telegram_id: row.telegram_id,
    username: row.username,
    first_name: row.first_name,
    level: row.current_level,
    total_xp: row.total_xp,
    avatar_id: row.avatar_id ?? null,
    current_streak: safeParseInt(row.best_current_streak as string | undefined, 0),
    total_quests_completed: safeParseInt(row.total_quests_completed as string | undefined, 0),
    xp_rank: safeParseInt(row.xp_rank as string | undefined, 0),
    level_rank: safeParseInt(row.level_rank as string | undefined, 0),
  }));

  res.json(successResponse(formatted));
}));

/**
 * GET /api/leaderboard/weekly
 * Returns leaderboard ranked by XP earned in the last 7 days.
 * Cached for 5 minutes.
 */
router.get('/weekly', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(safeParseInt(req.query.limit as string | undefined, 50), 100);

  const entries = await cached(`leaderboard:weekly:${limit}`, 300, () =>
    query<LeaderboardEntryRow>(
      `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
              u.current_level, u.total_xp, u.avatar_id,
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

  const formatted = entries.map((row: LeaderboardEntryRow, index: number) => ({
    user_id: row.user_id,
    telegram_id: row.telegram_id,
    username: row.username,
    first_name: row.first_name,
    level: row.current_level,
    total_xp: row.total_xp,
    avatar_id: row.avatar_id ?? null,
    weekly_xp: row.weekly_xp,
    rank: index + 1,
  }));

  res.json(successResponse(formatted));
}));

/**
 * GET /api/leaderboard/monthly
 * Returns leaderboard ranked by XP earned in the last 30 days.
 * Cached for 5 minutes.
 */
router.get('/monthly', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const limit = Math.min(safeParseInt(req.query.limit as string | undefined, 50), 100);

  const entries = await cached(`leaderboard:monthly:${limit}`, 300, () =>
    query<LeaderboardEntryRow>(
      `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
              u.current_level, u.total_xp, u.avatar_id,
              COALESCE(SUM(qi.xp_awarded), 0)::int AS monthly_xp
       FROM users u
       LEFT JOIN quest_instances qi
         ON qi.user_id = u.id
         AND qi.status = 'completed'
         AND qi.completed_at > NOW() - INTERVAL '30 days'
       WHERE u.is_active = true
       GROUP BY u.id
       HAVING COALESCE(SUM(qi.xp_awarded), 0) > 0
       ORDER BY monthly_xp DESC
       LIMIT $1`,
      [limit]
    )
  );

  const formatted = entries.map((row: LeaderboardEntryRow, index: number) => ({
    user_id: row.user_id,
    telegram_id: row.telegram_id,
    username: row.username,
    first_name: row.first_name,
    level: row.current_level,
    total_xp: row.total_xp,
    avatar_id: row.avatar_id ?? null,
    monthly_xp: row.monthly_xp,
    rank: index + 1,
  }));

  res.json(successResponse(formatted));
}));

export { router as leaderboardRouter };
