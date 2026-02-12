import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  NotFoundError,
} from '../utils/errors.js';
import { resolveUser } from './user-helpers.js';
import {
  UserModeRow,
  ActiveQuestRow,
  RecentAchievementRow,
  StreakRow,
  AggregatesRow,
  formatMode,
  formatQuest,
  formatAchievement,
  formatStreak,
} from './user-stats-helpers.js';

const router = Router();

/**
 * GET /api/users/:telegramId/stats
 * Comprehensive stats — consolidated from 10 queries down to 3.
 */
router.get('/:telegramId/stats', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.params;
  requireOwnership(req);
  const user = await resolveUser(telegramId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Run all supplementary queries in parallel (4 queries instead of 7)
  const [modes, activeQuests, aggregates, modeStreaks] = await Promise.all([
    // 1. Active modes with details
    query<UserModeRow>(
      `SELECT um.user_id, um.mode_id, um.is_active, um.enabled_at AS activated_at,
              m.id AS m_id, m.name, m.display_name, m.description, m.icon_emoji AS icon
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = $1 AND um.is_active = true`,
      [user.id]
    ),

    // 2. Active quests with mode info
    query<ActiveQuestRow>(
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type AS frequency, q.difficulty, qi.status,
              qi.check_in_count AS progress, qi.target,
              qi.instance_date AS due_date, qi.completed_at,
              m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       LEFT JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
       ORDER BY qi.instance_date DESC`,
      [user.id]
    ),

    // 3. Aggregates: completed today, XP today, days active — ONE query
    queryOne<AggregatesRow>(
      `SELECT
         (SELECT COUNT(*)::int FROM quest_instances
          WHERE user_id = $1 AND status = 'completed'
          AND completed_at::date = CURRENT_DATE) AS completed_today,
         (SELECT COALESCE(SUM(xp_awarded), 0)::int FROM quest_instances
          WHERE user_id = $1 AND completed_at::date = CURRENT_DATE) AS xp_today,
         (SELECT COUNT(DISTINCT instance_date)::int FROM quest_instances
          WHERE user_id = $1 AND status = 'completed') AS days_active`,
      [user.id]
    ),

    // 4. Per-mode streak breakdown
    query<StreakRow>(
      `SELECT s.mode_id, s.current_streak, s.longest_streak,
              m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
       FROM streaks s
       JOIN modes m ON s.mode_id = m.id
       WHERE s.user_id = $1 AND s.current_streak > 0
       ORDER BY s.current_streak DESC`,
      [user.id]
    ),
  ]);

  // Recent achievements (small separate query, fast with index)
  const recentAchievementsRows = await query<RecentAchievementRow>(
    `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
            a.name, a.description, a.badge_icon AS icon, a.xp_bonus AS xp_reward,
            a.rarity, COALESCE(a.criteria->>'mode', 'general') AS category
     FROM user_achievements ua
     JOIN achievements a ON ua.achievement_id = a.id
     WHERE ua.user_id = $1
     ORDER BY ua.unlocked_at DESC LIMIT 4`,
    [user.id]
  );

  res.json(successResponse({
    user,
    modes: modes.map(formatMode),
    activeQuests: activeQuests.map(r => formatQuest(r)),
    completedQuestsToday: aggregates?.completed_today ?? 0,
    recentAchievements: recentAchievementsRows.map(formatAchievement),
    xpGainedToday: aggregates?.xp_today ?? 0,
    streakData: {
      current: user.current_streak,
      longest: user.longest_streak,
      daysActive: aggregates?.days_active ?? 0,
    },
    perModeStreaks: modeStreaks.map(formatStreak),
  }));
}));

/**
 * GET /api/users/:telegramId/quests/active
 */
router.get('/:telegramId/quests/active', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.params;
  const tid = parseInt(telegramId);
  requireOwnership(req);

  const rows = await query<ActiveQuestRow>(
    `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
            q.quest_type AS frequency, q.difficulty, qi.status,
            qi.check_in_count AS progress, qi.target,
            qi.instance_date AS due_date, qi.completed_at,
            m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = (SELECT id FROM users WHERE telegram_id = $1)
       AND qi.status IN ('pending', 'ready', 'in_progress')
     ORDER BY qi.instance_date DESC`,
    [tid]
  );

  res.json(successResponse(rows.map(r => formatQuest(r, 'active'))));
}));

/**
 * GET /api/users/:telegramId/quests/completed
 */
router.get('/:telegramId/quests/completed', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.params;
  const tid = parseInt(telegramId);
  requireOwnership(req);
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const rows = await query<ActiveQuestRow>(
    `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
            q.quest_type AS frequency, q.difficulty, qi.status,
            qi.check_in_count AS progress, qi.target,
            qi.instance_date AS due_date, qi.completed_at,
            m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
     FROM quest_instances qi
     JOIN quests q ON qi.quest_id = q.id
     LEFT JOIN modes m ON q.mode_id = m.id
     WHERE qi.user_id = (SELECT id FROM users WHERE telegram_id = $1)
       AND qi.status = 'completed'
     ORDER BY qi.completed_at DESC LIMIT $2`,
    [tid, limit]
  );

  res.json(successResponse(rows.map(r => formatQuest(r, 'completed'))));
}));

/**
 * GET /api/users/:telegramId/achievements
 */
router.get('/:telegramId/achievements', authenticateTelegram, asyncHandler(async (req: Request, res: Response) => {
  const { telegramId } = req.params;
  const tid = parseInt(telegramId);
  requireOwnership(req);

  const rows = await query<RecentAchievementRow>(
    `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
            a.name, a.description, a.badge_icon AS icon, a.xp_bonus AS xp_reward,
            a.rarity, COALESCE(a.criteria->>'mode', 'general') AS category
     FROM user_achievements ua
     JOIN achievements a ON ua.achievement_id = a.id
     WHERE ua.user_id = (SELECT id FROM users WHERE telegram_id = $1)
     ORDER BY ua.unlocked_at DESC`,
    [tid]
  );

  res.json(successResponse(rows.map(formatAchievement)));
}));

export { router as statsRouter };
