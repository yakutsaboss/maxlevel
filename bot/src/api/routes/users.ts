import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { executePythonTool } from '../../utils/pythonTools.js';

const router = Router();

/**
 * Helper: look up user by telegram_id and return formatted object
 */
async function resolveUser(telegramId: string) {
  const result = await executePythonTool('db_operations', [
    '--query',
    `SELECT id, telegram_id, username, first_name, current_level, total_xp, is_active, timezone, created_at
     FROM users WHERE telegram_id = ${telegramId}`
  ]);

  if (!result.success || !result.data || result.data.length === 0) {
    return null;
  }

  const u = result.data[0];

  // Get streak data
  const streakResult = await executePythonTool('db_operations', [
    '--query',
    `SELECT COALESCE(MAX(current_streak), 0) as current_streak,
            COALESCE(MAX(longest_streak), 0) as longest_streak
     FROM streaks WHERE user_id = ${u.id}`
  ]);
  const streak = streakResult.success && streakResult.data?.[0] ? streakResult.data[0] : { current_streak: 0, longest_streak: 0 };

  // Count completed quests
  const questCountResult = await executePythonTool('db_operations', [
    '--query',
    `SELECT COUNT(*) as total FROM quest_instances WHERE user_id = ${u.id} AND status = 'completed'`
  ]);
  const totalCompleted = questCountResult.success && questCountResult.data?.[0] ? parseInt(questCountResult.data[0].total) : 0;

  const xpToNextLevel = u.current_level * 100;

  return {
    id: u.id,
    telegram_id: u.telegram_id,
    username: u.username,
    first_name: u.first_name,
    last_name: null,
    level: u.current_level,
    xp: u.total_xp,
    xp_to_next_level: xpToNextLevel,
    total_quests_completed: totalCompleted,
    current_streak: parseInt(streak.current_streak) || 0,
    longest_streak: parseInt(streak.longest_streak) || 0,
    created_at: u.created_at,
  };
}

/**
 * GET /api/users/:telegramId/stats
 * Comprehensive stats matching frontend UserStats type
 */
router.get('/:telegramId/stats', authenticateTelegram, async (req: Request, res: Response) => {
  try {
    const { telegramId } = req.params;
    const user = await resolveUser(telegramId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get active modes with mode details
    const modesResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT um.user_id, um.mode_id, um.is_active, um.enabled_at as activated_at,
              m.id as m_id, m.name, m.display_name, m.description, m.icon_emoji as icon
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = ${user.id} AND um.is_active = true`
    ]);

    const modes = (modesResult.success && modesResult.data || []).map((row: any) => ({
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

    // Get active quests
    const questsResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type as frequency, q.difficulty, qi.status,
              qi.check_in_count as progress, 1 as target,
              qi.instance_date as due_date, qi.completed_at,
              m.name as mode_name, m.display_name as mode_display_name, m.icon_emoji as mode_icon
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       LEFT JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = ${user.id} AND qi.status IN ('pending', 'ready', 'in_progress')
       ORDER BY qi.instance_date DESC`
    ]);

    const activeQuests = (questsResult.success && questsResult.data || []).map((row: any) => ({
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

    // Count completed quests today
    const todayResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT COUNT(*) as count FROM quest_instances
       WHERE user_id = ${user.id} AND status = 'completed'
       AND completed_at::date = CURRENT_DATE`
    ]);
    const completedToday = todayResult.success && todayResult.data?.[0] ? parseInt(todayResult.data[0].count) : 0;

    // Get recent achievements
    const achievementsResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
              a.name, a.description, a.icon_emoji as icon, a.xp_reward, a.category
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ${user.id}
       ORDER BY ua.unlocked_at DESC LIMIT 4`
    ]);

    const recentAchievements = (achievementsResult.success && achievementsResult.data || []).map((row: any) => ({
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

    // XP gained today
    const xpTodayResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT COALESCE(SUM(xp_awarded), 0) as xp_today FROM quest_instances
       WHERE user_id = ${user.id} AND completed_at::date = CURRENT_DATE`
    ]);
    const xpGainedToday = xpTodayResult.success && xpTodayResult.data?.[0] ? parseInt(xpTodayResult.data[0].xp_today) : 0;

    // Days active
    const daysActiveResult = await executePythonTool('db_operations', [
      '--query',
      `SELECT COUNT(DISTINCT instance_date) as days FROM quest_instances
       WHERE user_id = ${user.id} AND status = 'completed'`
    ]);
    const daysActive = daysActiveResult.success && daysActiveResult.data?.[0] ? parseInt(daysActiveResult.data[0].days) : 0;

    res.json({
      success: true,
      data: {
        user,
        modes,
        activeQuests,
        completedQuestsToday: completedToday,
        recentAchievements,
        xpGainedToday,
        streakData: {
          current: user.current_streak,
          longest: user.longest_streak,
          daysActive,
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
    const user = await resolveUser(telegramId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await executePythonTool('db_operations', [
      '--query',
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type as frequency, q.difficulty, qi.status,
              qi.check_in_count as progress, 1 as target,
              qi.instance_date as due_date, qi.completed_at,
              m.name as mode_name, m.display_name as mode_display_name, m.icon_emoji as mode_icon
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       LEFT JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = ${user.id} AND qi.status IN ('pending', 'ready', 'in_progress')
       ORDER BY qi.instance_date DESC`
    ]);

    const quests = (result.success && result.data || []).map((row: any) => ({
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
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const user = await resolveUser(telegramId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await executePythonTool('db_operations', [
      '--query',
      `SELECT qi.id, qi.user_id, q.mode_id, q.title, q.description, q.xp_reward,
              q.quest_type as frequency, q.difficulty, qi.status,
              qi.check_in_count as progress, 1 as target,
              qi.instance_date as due_date, qi.completed_at,
              m.name as mode_name, m.display_name as mode_display_name, m.icon_emoji as mode_icon
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       LEFT JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = ${user.id} AND qi.status = 'completed'
       ORDER BY qi.completed_at DESC LIMIT ${limit}`
    ]);

    const quests = (result.success && result.data || []).map((row: any) => ({
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
    const user = await resolveUser(telegramId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await executePythonTool('db_operations', [
      '--query',
      `SELECT ua.user_id, ua.achievement_id, ua.unlocked_at,
              a.name, a.description, a.icon_emoji as icon, a.xp_reward, a.category
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = ${user.id}
       ORDER BY ua.unlocked_at DESC`
    ]);

    const achievements = (result.success && result.data || []).map((row: any) => ({
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

    const args = [
      '--create-user',
      '--telegram-id', telegramId.toString(),
      '--first-name', firstName
    ];

    if (lastName) args.push('--last-name', lastName);
    if (username) args.push('--username', username);

    const result = await executePythonTool('user_manager', args);

    if (!result.success) {
      return res.status(500).json({ error: 'Server Error', message: 'Failed to create user' });
    }

    res.status(201).json({ message: 'User created successfully', user: result.data });
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
    const { userId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Bad Request', message: 'Invalid XP amount' });
    }

    const result = await executePythonTool('user_manager', [
      '--add-xp', '--user-id', userId, '--xp', amount.toString()
    ]);

    if (!result.success) {
      return res.status(500).json({ error: 'Server Error', message: 'Failed to add XP' });
    }

    res.json({
      message: 'XP added successfully',
      newTotal: result.data.total_xp,
      newLevel: result.data.level,
      leveledUp: result.data.leveled_up || false,
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

    res.json({ message: 'Streak updated successfully', streak: result.data.current_streak });
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update streak' });
  }
});

export { router as userRouter };
