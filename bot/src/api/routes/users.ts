import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { cached, invalidatePrefix, TTL } from '../../utils/cache.js';
import { executePythonTool } from '../../utils/pythonTools.js';

const router = Router();

/**
 * Helper: look up user by telegram_id with streak + quest count in ONE query.
 * Replaces 3 separate Python subprocess calls with 1 native SQL query.
 */
async function resolveUser(telegramId: string) {
  const tid = parseInt(telegramId);
  if (isNaN(tid)) return null;

  const u = await queryOne(
    `SELECT u.id, u.telegram_id, u.username, u.first_name,
            u.current_level, u.total_xp, u.is_active, u.timezone, u.created_at,
            COALESCE(s.current_streak, 0)::int AS current_streak,
            COALESCE(s.longest_streak, 0)::int AS longest_streak,
            COALESCE(qc.total, 0)::int AS total_quests_completed
     FROM users u
     LEFT JOIN LATERAL (
       SELECT MAX(current_streak) AS current_streak, MAX(longest_streak) AS longest_streak
       FROM streaks WHERE user_id = u.id
     ) s ON true
     LEFT JOIN LATERAL (
       SELECT COUNT(*)::int AS total
       FROM quest_instances WHERE user_id = u.id AND status = 'completed'
     ) qc ON true
     WHERE u.telegram_id = $1`,
    [tid]
  );

  if (!u) return null;

  return {
    id: u.id,
    telegram_id: u.telegram_id,
    username: u.username,
    first_name: u.first_name,
    last_name: null,
    level: u.current_level,
    xp: u.total_xp,
    xp_to_next_level: u.current_level * 100,
    total_quests_completed: u.total_quests_completed,
    current_streak: u.current_streak,
    longest_streak: u.longest_streak,
    created_at: u.created_at,
  };
}

/**
 * GET /api/users/:telegramId/stats
 * Comprehensive stats — consolidated from 10 queries down to 3.
 */
router.get('/:telegramId/stats', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const user = await resolveUser(telegramId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Run all supplementary queries in parallel (3 queries instead of 7)
    const [modes, activeQuests, aggregates] = await Promise.all([
      // 1. Active modes with details
      query(
        `SELECT um.user_id, um.mode_id, um.is_active, um.enabled_at AS activated_at,
                m.id AS m_id, m.name, m.display_name, m.description, m.icon_emoji AS icon
         FROM user_modes um
         JOIN modes m ON um.mode_id = m.id
         WHERE um.user_id = $1 AND um.is_active = true`,
        [user.id]
      ),

      // 2. Active quests with mode info
      query(
        `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
                q.quest_type AS frequency, q.difficulty, qi.status,
                qi.check_in_count AS progress, 1 AS target,
                qi.instance_date AS due_date, qi.completed_at,
                m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
         FROM quest_instances qi
         JOIN quests q ON qi.quest_id = q.id
         LEFT JOIN modes m ON q.mode_id = m.id
         WHERE qi.user_id = $1 AND qi.status IN ('pending', 'ready', 'in_progress')
         ORDER BY qi.instance_date DESC`,
        [user.id]
      ),

      // 3. Aggregates: completed today, XP today, days active, recent achievements — ONE query
      queryOne(
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
    ]);

    // Recent achievements (small separate query, fast with index)
    const recentAchievementsRows = await query(
      `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
              a.name, a.description, a.badge_icon AS icon, a.xp_bonus AS xp_reward,
              a.rarity AS category
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC LIMIT 4`,
      [user.id]
    );

    // Format response
    const formattedModes = modes.map((row: any) => ({
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

    const formattedQuests = activeQuests.map((row: any) => ({
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

    const recentAchievements = recentAchievementsRows.map((row: any) => ({
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      unlocked_at: row.unlocked_at,
      achievement: {
        id: row.achievement_id,
        name: row.name,
        description: row.description,
        icon: row.icon || '🏆',
        xp_reward: row.xp_reward,
        category: row.category,
      },
    }));

    res.json({
      success: true,
      data: {
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
      },
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user stats' });
  }
});

/**
 * GET /api/users/:telegramId/quests/active
 */
router.get('/:telegramId/quests/active', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const tid = parseInt(telegramId);

    // Single query: resolve user + get quests
    const rows = await query(
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type AS frequency, q.difficulty, qi.status,
              qi.check_in_count AS progress, 1 AS target,
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

    const quests = rows.map((row: any) => ({
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

    res.json({ success: true, data: quests });
  } catch (error) {
    console.error('Error fetching active quests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active quests' });
  }
});

/**
 * GET /api/users/:telegramId/quests/completed
 */
router.get('/:telegramId/quests/completed', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const tid = parseInt(telegramId);
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    const rows = await query(
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type AS frequency, q.difficulty, qi.status,
              qi.check_in_count AS progress, 1 AS target,
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

    const quests = rows.map((row: any) => ({
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

    res.json({ success: true, data: quests });
  } catch (error) {
    console.error('Error fetching completed quests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch completed quests' });
  }
});

/**
 * GET /api/users/:telegramId/achievements
 */
router.get('/:telegramId/achievements', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const tid = parseInt(telegramId);

    const rows = await query(
      `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
              a.name, a.description, a.badge_icon AS icon, a.xp_bonus AS xp_reward,
              a.rarity AS category
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = (SELECT id FROM users WHERE telegram_id = $1)
       ORDER BY ua.unlocked_at DESC`,
      [tid]
    );

    const achievements = rows.map((row: any) => ({
      user_id: row.user_id,
      achievement_id: row.achievement_id,
      unlocked_at: row.unlocked_at,
      achievement: {
        id: row.achievement_id,
        name: row.name,
        description: row.description,
        icon: row.icon || '🏆',
        xp_reward: row.xp_reward,
        category: row.category,
        requirement_type: '',
        requirement_value: 0,
        is_hidden: false,
      },
    }));

    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error fetching user achievements:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch achievements' });
  }
});

/**
 * POST /api/users
 * Create a new user (called from bot on /start)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { telegramId, firstName, lastName, username } = req.body;

    if (!telegramId || !firstName) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: telegramId, firstName',
      });
    }

    const user = await queryOne(
      `INSERT INTO users (telegram_id, username, first_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (telegram_id) DO UPDATE SET
         username = COALESCE(EXCLUDED.username, users.username),
         first_name = COALESCE(EXCLUDED.first_name, users.first_name)
       RETURNING *`,
      [telegramId, username || null, firstName]
    );

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to create user' });
  }
});

/**
 * PATCH /api/users/:userId/xp
 */
router.patch('/:userId/xp', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid XP amount' });
    }

    const user = await queryOne(
      `UPDATE users
       SET total_xp = total_xp + $1,
           current_level = ((total_xp + $1) / 500) + 1
       WHERE id = $2
       RETURNING total_xp, current_level`,
      [amount, userId]
    );

    if (!user) {
      return res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    res.json({
      message: 'XP added successfully',
      newTotal: user.total_xp,
      newLevel: user.current_level,
      leveledUp: false,
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to add XP' });
  }
});

/**
 * PATCH /api/users/:userId/streak
 */
router.patch('/:userId/streak', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await executePythonTool('user_manager', [
      '--update-streak', '--user-id', userId
    ]);

    if (!result.success) {
      return res.status(500).json({ error: 'Server Error', message: 'Failed to update streak' });
    }

    res.json({ message: 'Streak updated successfully', streak: (result.data as any)?.current_streak });
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update streak' });
  }
});

/**
 * GET /api/users/:telegramId/preferences
 * Returns user notification/timezone preferences.
 */
router.get('/:telegramId/preferences', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const tid = parseInt(req.params.telegramId);
    if (isNaN(tid)) {
      return res.status(400).json({ success: false, error: 'Invalid telegram ID' });
    }

    const user = await queryOne(
      `SELECT notification_enabled, reminder_time, timezone FROM users WHERE telegram_id = $1`,
      [tid]
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        notification_enabled: user.notification_enabled ?? true,
        reminder_time: user.reminder_time ?? 9,
        timezone: user.timezone || 'Europe/Moscow',
      },
    });
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch preferences' });
  }
});

/**
 * PATCH /api/users/:telegramId/preferences
 * Update user notification/timezone preferences.
 */
router.patch('/:telegramId/preferences', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const tid = parseInt(req.params.telegramId);
    if (isNaN(tid)) {
      return res.status(400).json({ success: false, error: 'Invalid telegram ID' });
    }

    const { notification_enabled, reminder_time, timezone } = req.body;

    // Validate fields
    if (notification_enabled !== undefined && typeof notification_enabled !== 'boolean') {
      return res.status(400).json({ success: false, error: 'notification_enabled must be a boolean' });
    }
    if (reminder_time !== undefined) {
      const rt = parseInt(reminder_time);
      if (isNaN(rt) || rt < 0 || rt > 23) {
        return res.status(400).json({ success: false, error: 'reminder_time must be an integer 0-23' });
      }
    }
    if (timezone !== undefined && (typeof timezone !== 'string' || timezone.length === 0)) {
      return res.status(400).json({ success: false, error: 'timezone must be a non-empty string' });
    }

    // Build SET clause dynamically from provided fields
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (notification_enabled !== undefined) {
      sets.push(`notification_enabled = $${idx++}`);
      params.push(notification_enabled);
    }
    if (reminder_time !== undefined) {
      sets.push(`reminder_time = $${idx++}`);
      params.push(parseInt(reminder_time));
    }
    if (timezone !== undefined) {
      sets.push(`timezone = $${idx++}`);
      params.push(timezone);
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, error: 'No valid fields to update' });
    }

    params.push(tid);
    const user = await queryOne(
      `UPDATE users SET ${sets.join(', ')} WHERE telegram_id = $${idx} RETURNING notification_enabled, reminder_time, timezone`,
      params
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        notification_enabled: user.notification_enabled,
        reminder_time: user.reminder_time,
        timezone: user.timezone,
      },
    });
  } catch (error) {
    console.error('Error updating user preferences:', error);
    res.status(500).json({ success: false, error: 'Failed to update preferences' });
  }
});

export { router as userRouter };
