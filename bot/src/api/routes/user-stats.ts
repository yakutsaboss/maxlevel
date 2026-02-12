import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  NotFoundError,
} from '../utils/errors.js';
import { resolveUser } from './user-helpers.js';

/** Row returned by the active-modes JOIN query */
interface UserModeRow {
  user_id: number;
  mode_id: number;
  is_active: boolean;
  activated_at: string;
  m_id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
}

/** Row returned by quest_instances JOIN quests JOIN modes queries */
interface ActiveQuestRow {
  id: number;
  user_id: number;
  mode_id: number;
  title: string;
  description: string;
  xp_reward: number;
  frequency: string;
  difficulty: string | null;
  status: string;
  progress: number | null;
  target: number | null;
  due_date: string;
  completed_at: string | null;
  mode_name: string | null;
  mode_display_name: string | null;
  mode_icon: string | null;
}

/** Row returned by user_achievements JOIN achievements queries */
interface RecentAchievementRow {
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  name: string;
  description: string;
  icon: string | null;
  xp_reward: number;
  rarity: string;
  category: string;
}

/** Row returned by the per-mode streaks query */
interface StreakRow {
  mode_id: number;
  current_streak: number;
  longest_streak: number;
  mode_name: string;
  mode_display_name: string;
  mode_icon: string;
}

/** Aggregated stats from the single-row aggregates query */
interface AggregatesRow {
  completed_today: number;
  xp_today: number;
  days_active: number;
}

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

  // Format response
  const formattedModes = modes.map((row: UserModeRow) => ({
    user_id: row.user_id,
    mode_id: row.mode_id,
    is_active: row.is_active,
    activated_at: row.activated_at,
    mode: {
      id: row.m_id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      icon: row.icon,
      is_active: true,
    },
  }));

  const formattedQuests = activeQuests.map((row: ActiveQuestRow) => ({
    id: row.id,
    user_id: row.user_id,
    mode_id: row.mode_id,
    title: row.title,
    description: row.description,
    xp_reward: row.xp_reward,
    frequency: row.frequency === 'daily' ? 'daily' : 'weekly',
    difficulty: row.difficulty || 'medium',
    status: row.status === 'in_progress' ? 'active' : row.status,
    progress: row.progress || 0,
    target: row.target || 1,
    due_date: row.due_date,
    completed_at: row.completed_at,
    mode: row.mode_name ? {
      id: row.mode_id,
      name: row.mode_name,
      display_name: row.mode_display_name,
      icon: row.mode_icon,
    } : undefined,
  }));

  const recentAchievements = recentAchievementsRows.map((row: RecentAchievementRow) => ({
    user_id: row.user_id,
    achievement_id: row.achievement_id,
    unlocked_at: row.unlocked_at,
    achievement: {
      id: row.achievement_id,
      name: row.name,
      description: row.description,
      icon: row.icon || '\u{1F3C6}',
      xp_reward: row.xp_reward,
      rarity: row.rarity,
      category: row.category || '',
    },
  }));

  res.json(successResponse({
    user,
    modes: formattedModes,
    activeQuests: formattedQuests,
    completedQuestsToday: aggregates?.completed_today ?? 0,
    recentAchievements,
    xpGainedToday: aggregates?.xp_today ?? 0,
    streakData: {
      current: user.current_streak,
      longest: user.longest_streak,
      daysActive: aggregates?.days_active ?? 0,
    },
    perModeStreaks: modeStreaks.map((s: StreakRow) => ({
      mode_id: s.mode_id,
      mode_name: s.mode_display_name,
      mode_icon: s.mode_icon,
      current_streak: s.current_streak,
      longest_streak: s.longest_streak,
    })),
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

  const quests = rows.map((row: ActiveQuestRow) => ({
    id: row.id,
    user_id: row.user_id,
    mode_id: row.mode_id,
    title: row.title,
    description: row.description,
    xp_reward: row.xp_reward,
    frequency: row.frequency === 'daily' ? 'daily' : 'weekly',
    difficulty: row.difficulty || 'medium',
    status: 'active' as const,
    progress: row.progress || 0,
    target: row.target || 1,
    due_date: row.due_date,
    completed_at: row.completed_at,
    mode: row.mode_name ? {
      id: row.mode_id,
      name: row.mode_name,
      display_name: row.mode_display_name,
      icon: row.mode_icon,
    } : undefined,
  }));

  res.json(successResponse(quests));
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

  const quests = rows.map((row: ActiveQuestRow) => ({
    id: row.id,
    user_id: row.user_id,
    mode_id: row.mode_id,
    title: row.title,
    description: row.description,
    xp_reward: row.xp_reward,
    frequency: row.frequency === 'daily' ? 'daily' : 'weekly',
    difficulty: row.difficulty || 'medium',
    status: 'completed' as const,
    progress: row.progress || 0,
    target: row.target || 1,
    due_date: row.due_date,
    completed_at: row.completed_at,
    mode: row.mode_name ? {
      id: row.mode_id,
      name: row.mode_name,
      display_name: row.mode_display_name,
      icon: row.mode_icon,
    } : undefined,
  }));

  res.json(successResponse(quests));
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

  const achievements = rows.map((row: RecentAchievementRow) => ({
    user_id: row.user_id,
    achievement_id: row.achievement_id,
    unlocked_at: row.unlocked_at,
    achievement: {
      id: row.achievement_id,
      name: row.name,
      description: row.description,
      icon: row.icon || '\u{1F3C6}',
      xp_reward: row.xp_reward,
      rarity: row.rarity,
      category: row.category || '',
    },
  }));

  res.json(successResponse(achievements));
}));

export { router as statsRouter };
