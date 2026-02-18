import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import { cached, TTL } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

// ---- Time range support ----

type RangeOption = '7d' | '30d' | 'all';
const VALID_RANGES: RangeOption[] = ['7d', '30d', 'all'];

/** Parse ?range= query param into a SQL interval expression and cache key suffix. */
function parseRange(raw: unknown): { interval: string | null; key: string } {
  const r = (typeof raw === 'string' ? raw : '7d') as RangeOption;
  if (!VALID_RANGES.includes(r)) {
    return { interval: "INTERVAL '6 days'", key: '7d' };
  }
  if (r === 'all') return { interval: null, key: 'all' };
  if (r === '30d') return { interval: "INTERVAL '29 days'", key: '30d' };
  return { interval: "INTERVAL '6 days'", key: '7d' };
}

// ---- Type definitions for analytics query rows ----

interface ModeAnalyticsRow {
  [key: string]: unknown;
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon_emoji: string;
  total_quests: number;
  completed_quests: number;
  total_xp_earned: number;
  current_streak: number;
  longest_streak: number;
}

interface ModeDetailQuestRow {
  [key: string]: unknown;
  quest_instance_id: number;
  title: string;
  quest_type: string;
  difficulty: string;
  status: string;
  xp_awarded: number;
  instance_date: string;
  completed_at: string | null;
  check_in_count: number;
  target: number;
}

interface ProgressSummaryRow {
  [key: string]: unknown;
  total_xp: number;
  current_level: number;
  quests_completed: number;
  quests_total: number;
  active_modes: number;
  active_streaks: number;
  best_streak: number;
  days_active: number;
  xp_this_week: number;
}

/**
 * GET /api/analytics/:userId/modes
 * Returns per-mode completion rates, streak trends, and XP breakdown.
 * This endpoint powers the mode analytics progress dashboard.
 */
router.get('/:userId/modes', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) throw new BadRequestError('Invalid userId');

  const range = parseRange(req.query.range);

  const modeAnalytics = await cached(`analytics:modes:${userId}:${range.key}`, TTL.MEDIUM, async () => {
    const dateFilter = range.interval
      ? `AND qi.instance_date >= CURRENT_DATE - ${range.interval}`
      : '';

    const rows = await query<ModeAnalyticsRow>(
      `SELECT
         m.id AS mode_id,
         m.name AS mode_name,
         m.display_name,
         m.icon_emoji,
         COUNT(qi.id)::int AS total_quests,
         COUNT(qi.id) FILTER (WHERE qi.status = 'completed')::int AS completed_quests,
         COALESCE(SUM(qi.xp_awarded) FILTER (WHERE qi.status = 'completed'), 0)::int AS total_xp_earned,
         COALESCE(s.current_streak, 0)::int AS current_streak,
         COALESCE(s.longest_streak, 0)::int AS longest_streak
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       LEFT JOIN quests q ON q.mode_id = m.id
       LEFT JOIN quest_instances qi ON qi.quest_id = q.id AND qi.user_id = um.user_id ${dateFilter}
       LEFT JOIN streaks s ON s.user_id = um.user_id AND s.mode_id = m.id
       WHERE um.user_id = $1 AND um.is_active = true
       GROUP BY m.id, m.name, m.display_name, m.icon_emoji, s.current_streak, s.longest_streak
       ORDER BY total_xp_earned DESC`,
      [userId]
    );

    return rows.map((row) => ({
      mode_id: row.mode_id,
      mode_name: row.mode_name,
      display_name: row.display_name,
      icon: row.icon_emoji,
      completion_rate: row.total_quests > 0
        ? Math.round((row.completed_quests / row.total_quests) * 100)
        : 0,
      total_quests: row.total_quests,
      completed_quests: row.completed_quests,
      xp_earned: row.total_xp_earned,
      streak: {
        current: row.current_streak,
        longest: row.longest_streak,
      },
    }));
  });

  res.json(successResponse(modeAnalytics));
}));

/**
 * GET /api/analytics/:userId/modes/:mode
 * Returns detailed analytics for a specific mode including quest history.
 * The :mode param is the mode name (e.g. 'fitness', 'hydration').
 */
router.get('/:userId/modes/:mode', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  const modeName = req.params.mode;
  if (isNaN(userId)) throw new BadRequestError('Invalid userId');

  // Verify mode exists
  const mode = await queryOne<{ id: number; name: string; display_name: string; icon_emoji: string }>(
    `SELECT id, name, display_name, icon_emoji FROM modes WHERE name = $1`,
    [modeName]
  );
  if (!mode) throw new NotFoundError(`Mode '${modeName}' not found`);

  const modeDetail = await cached(`analytics:mode:${userId}:${modeName}`, TTL.MEDIUM, async () => {
    // Run progress analytics queries in parallel
    const [questHistory, streakData, weeklyXp] = await Promise.all([
      // Recent quest instances for this mode
      query<ModeDetailQuestRow>(
        `SELECT
           qi.id AS quest_instance_id,
           q.title,
           q.quest_type,
           q.difficulty,
           qi.status,
           qi.xp_awarded,
           qi.instance_date::text,
           qi.completed_at::text,
           qi.check_in_count,
           qi.target
         FROM quest_instances qi
         JOIN quests q ON qi.quest_id = q.id
         WHERE qi.user_id = $1 AND q.mode_id = $2
         ORDER BY qi.instance_date DESC
         LIMIT 30`,
        [userId, mode.id]
      ),

      // Streak data for this mode
      queryOne<{ current_streak: number; longest_streak: number; last_activity_date: string | null }>(
        `SELECT current_streak, longest_streak, last_activity_date::text
         FROM streaks
         WHERE user_id = $1 AND mode_id = $2`,
        [userId, mode.id]
      ),

      // XP earned per day in the last 7 days for this mode
      query<{ day: string; xp: number }>(
        `SELECT
           qi.instance_date::text AS day,
           COALESCE(SUM(qi.xp_awarded), 0)::int AS xp
         FROM quest_instances qi
         JOIN quests q ON qi.quest_id = q.id
         WHERE qi.user_id = $1 AND q.mode_id = $2
           AND qi.status = 'completed'
           AND qi.instance_date >= CURRENT_DATE - INTERVAL '6 days'
         GROUP BY qi.instance_date
         ORDER BY qi.instance_date ASC`,
        [userId, mode.id]
      ),
    ]);

    const totalQuests = questHistory.length;
    const completedQuests = questHistory.filter((q) => q.status === 'completed').length;

    return {
      mode: {
        id: mode.id,
        name: mode.name,
        display_name: mode.display_name,
        icon: mode.icon_emoji,
      },
      progress: {
        completion_rate: totalQuests > 0 ? Math.round((completedQuests / totalQuests) * 100) : 0,
        total_quests: totalQuests,
        completed_quests: completedQuests,
      },
      streak: {
        current: streakData?.current_streak ?? 0,
        longest: streakData?.longest_streak ?? 0,
        last_activity: streakData?.last_activity_date ?? null,
      },
      weekly_xp: weeklyXp,
      quest_history: questHistory.map((q) => ({
        id: q.quest_instance_id,
        title: q.title,
        type: q.quest_type,
        difficulty: q.difficulty,
        status: q.status,
        xp_awarded: q.xp_awarded,
        date: q.instance_date,
        completed_at: q.completed_at,
        check_ins: q.check_in_count,
        target: q.target,
      })),
    };
  });

  res.json(successResponse(modeDetail));
}));

/**
 * GET /api/analytics/:userId/summary
 * Returns overall progress summary: total XP, level, quests completed, active streaks.
 */
router.get('/:userId/summary', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) throw new BadRequestError('Invalid userId');

  const range = parseRange(req.query.range);

  const summary = await cached(`analytics:summary:${userId}:${range.key}`, 2 * 60_000, async () => {
    const dateFilter = range.interval
      ? `AND instance_date >= CURRENT_DATE - ${range.interval}`
      : '';

    const row = await queryOne<ProgressSummaryRow>(
      `WITH quest_stats AS (
         SELECT
           COUNT(*) FILTER (WHERE status = 'completed') AS quests_completed,
           COUNT(*) AS quests_total,
           COUNT(DISTINCT instance_date) FILTER (WHERE status = 'completed') AS days_active,
           COALESCE(SUM(xp_awarded) FILTER (WHERE status = 'completed' AND completed_at >= CURRENT_DATE - INTERVAL '6 days'), 0)::int AS xp_this_week
         FROM quest_instances WHERE user_id = $1 ${dateFilter}
       ),
       mode_stats AS (
         SELECT
           COUNT(*) FILTER (WHERE is_active = true) AS active_modes
         FROM user_modes WHERE user_id = $1
       ),
       streak_stats AS (
         SELECT
           COUNT(*) FILTER (WHERE current_streak > 0) AS active_streaks,
           COALESCE(MAX(current_streak), 0)::int AS best_streak
         FROM streaks WHERE user_id = $1
       )
       SELECT
         u.total_xp, u.current_level,
         q.quests_completed::int, q.quests_total::int,
         m.active_modes::int,
         s.active_streaks::int, s.best_streak,
         q.days_active::int, q.xp_this_week
       FROM users u, quest_stats q, mode_stats m, streak_stats s
       WHERE u.id = $1`,
      [userId]
    );

    if (!row) return null;

    return {
      total_xp: row.total_xp,
      level: row.current_level,
      quests_completed: row.quests_completed,
      quests_total: row.quests_total,
      completion_rate: row.quests_total > 0
        ? Math.round((row.quests_completed / row.quests_total) * 100)
        : 0,
      active_modes: row.active_modes,
      active_streaks: row.active_streaks,
      best_streak: row.best_streak,
      days_active: row.days_active,
      xp_this_week: row.xp_this_week,
    };
  });

  if (!summary) throw new NotFoundError('User not found');

  res.json(successResponse(summary));
}));

export { router as analyticsRouter };
