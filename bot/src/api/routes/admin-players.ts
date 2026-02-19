/**
 * Admin Player Management Routes (Run 77)
 * Enhanced player listing, detail views, and admin actions
 * (award XP, unlock achievements, change tier, send message, audit log)
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/adminAuth.js';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { awardXp } from '../../utils/xpAward.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { safeParseInt } from '../../utils/validation.js';
import { broadcastMessage } from '../../utils/broadcast.js';

const log = logger.child({ component: 'adminPlayers' });

const router = Router();

// --- Interfaces ---

interface PlayerRow {
  id: number;
  telegram_id: number;
  username: string | null;
  first_name: string | null;
  current_level: number;
  total_xp: number;
  is_active: boolean;
  created_at: string;
  avatar_id: number;
  tier: string | null;
  modes: string | null;
  last_active: string | null;
  [key: string]: unknown;
}

interface AuditLogRow {
  id: number;
  admin_id: string;
  action: string;
  target_user_id: number | null;
  details: Record<string, unknown> | null;
  created_at: string;
  [key: string]: unknown;
}

// --- Helper: log admin action ---

async function logAuditAction(
  adminId: string,
  action: string,
  targetUserId: number | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    await execute(
      `INSERT INTO admin_audit_log (admin_id, action, target_user_id, details)
       VALUES ($1, $2, $3, $4)`,
      [adminId, action, targetUserId, JSON.stringify(details)],
    );
  } catch (err) {
    log.error('Failed to log audit action', err as Error, { adminId, action, targetUserId });
  }
}

// --- Allowed sort columns (whitelist to prevent SQL injection) ---

const ALLOWED_SORT_COLUMNS: Record<string, string> = {
  level: 'u.current_level',
  xp: 'u.total_xp',
  username: 'u.username',
  first_name: 'u.first_name',
  telegram_id: 'u.telegram_id',
  created_at: 'u.created_at',
  id: 'u.id',
};

/**
 * GET /api/admin/players/audit-log
 * Paginated audit log with filters
 * NOTE: Must be defined before /:userId to avoid matching "audit-log" as a userId
 */
router.get('/audit-log', requirePermission('users:read'), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, safeParseInt(req.query.page as string, 1));
  const limit = Math.max(1, Math.min(safeParseInt(req.query.limit as string, 50), 200));
  const offset = (page - 1) * limit;
  const actionFilter = req.query.action as string || '';
  const targetUserFilter = safeParseInt(req.query.target_user_id as string, 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (actionFilter) {
    conditions.push(`aal.action = $${paramIdx}`);
    params.push(actionFilter);
    paramIdx++;
  }

  if (targetUserFilter) {
    conditions.push(`aal.target_user_id = $${paramIdx}`);
    params.push(targetUserFilter);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await queryOne<{ count: string; [key: string]: unknown }>(
    `SELECT COUNT(*) as count FROM admin_audit_log aal ${whereClause}`,
    params,
  );
  const total = parseInt(countResult?.count || '0', 10);

  const logs = await query<AuditLogRow>(
    `SELECT aal.*, u.username as target_username, u.first_name as target_first_name
     FROM admin_audit_log aal
     LEFT JOIN users u ON aal.target_user_id = u.id
     ${whereClause}
     ORDER BY aal.created_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );

  res.json(successResponse({
    logs,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }));
}));

/**
 * GET /api/admin/players
 * Enhanced player list with pagination, search, sort, and filters
 */
router.get('/', requirePermission('users:read'), asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, safeParseInt(req.query.page as string, 1));
  const limit = Math.max(1, Math.min(safeParseInt(req.query.limit as string, 50), 200));
  const offset = (page - 1) * limit;
  const search = (req.query.search as string || '').trim();
  const sortCol = ALLOWED_SORT_COLUMNS[req.query.sort as string] || 'u.id';
  const order = (req.query.order as string || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const tierFilter = req.query.tier as string || '';
  const modeFilter = req.query.mode as string || '';
  const statusFilter = req.query.status as string || '';
  const dateFrom = req.query.date_from as string || '';
  const dateTo = req.query.date_to as string || '';

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Search by name, username, or telegram_id
  if (search) {
    conditions.push(`(u.username ILIKE $${paramIdx} OR u.first_name ILIKE $${paramIdx} OR u.telegram_id::text LIKE $${paramIdx + 1})`);
    params.push(`%${search}%`, `%${search}%`);
    paramIdx += 2;
  }

  // Tier filter
  if (tierFilter) {
    conditions.push(`s.tier = $${paramIdx}`);
    params.push(tierFilter);
    paramIdx++;
  }

  // Mode filter
  if (modeFilter) {
    conditions.push(`EXISTS (SELECT 1 FROM user_modes um2 JOIN modes m2 ON um2.mode_id = m2.id WHERE um2.user_id = u.id AND um2.is_active = true AND m2.name = $${paramIdx})`);
    params.push(modeFilter);
    paramIdx++;
  }

  // Status filter (active/inactive)
  if (statusFilter === 'active') {
    conditions.push('u.is_active = true');
  } else if (statusFilter === 'inactive') {
    conditions.push('u.is_active = false');
  }

  // Date range
  if (dateFrom) {
    conditions.push(`u.created_at >= $${paramIdx}::timestamptz`);
    params.push(dateFrom);
    paramIdx++;
  }
  if (dateTo) {
    conditions.push(`u.created_at <= $${paramIdx}::timestamptz`);
    params.push(dateTo);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count query
  const countResult = await queryOne<{ count: string; [key: string]: unknown }>(
    `SELECT COUNT(DISTINCT u.id) as count
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     ${whereClause}`,
    params,
  );
  const total = parseInt(countResult?.count || '0', 10);

  // Data query with modes aggregated
  const players = await query<PlayerRow>(
    `SELECT u.id, u.telegram_id, u.username, u.first_name, u.current_level,
            u.total_xp, u.is_active, u.created_at, u.avatar_id,
            COALESCE(s.tier, 'free') as tier,
            STRING_AGG(DISTINCT m.name, ', ' ORDER BY m.name) as modes,
            (SELECT MAX(al.created_at) FROM activity_logs al WHERE al.user_id = u.id) as last_active
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     LEFT JOIN user_modes um ON um.user_id = u.id AND um.is_active = true
     LEFT JOIN modes m ON um.mode_id = m.id
     ${whereClause}
     GROUP BY u.id, u.telegram_id, u.username, u.first_name, u.current_level,
              u.total_xp, u.is_active, u.created_at, u.avatar_id, s.tier
     ORDER BY ${sortCol} ${order}
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );

  res.json(successResponse({
    players,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  }));
}));

/**
 * GET /api/admin/players/:userId
 * Full player detail view
 */
router.get('/:userId', requirePermission('users:read'), asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (!userId) throw new BadRequestError('Invalid user ID');

  // Core user data + tier
  const user = await queryOne<PlayerRow>(
    `SELECT u.*, COALESCE(s.tier, 'free') as tier
     FROM users u
     LEFT JOIN subscriptions s ON s.user_id = u.id
     WHERE u.id = $1`,
    [userId],
  );
  if (!user) throw new NotFoundError('User not found');

  // Parallel queries for detail sections
  const [modes, recentQuests, achievements, recentActivities, stats, contentProgress] = await Promise.all([
    // Active modes
    query<{ name: string; display_name: string; icon_emoji: string; enabled_at: string; [key: string]: unknown }>(
      `SELECT m.name, m.display_name, m.icon_emoji, um.enabled_at
       FROM user_modes um
       JOIN modes m ON um.mode_id = m.id
       WHERE um.user_id = $1 AND um.is_active = true
       ORDER BY um.enabled_at`,
      [userId],
    ),
    // Recent quest instances
    query<{ quest_name: string; status: string; started_at: string; completed_at: string | null; xp_reward: number; [key: string]: unknown }>(
      `SELECT q.title as quest_name, qi.status, qi.started_at, qi.completed_at, q.xp_reward
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       WHERE qi.user_id = $1
       ORDER BY qi.started_at DESC
       LIMIT 20`,
      [userId],
    ),
    // Achievements
    query<{ name: string; description: string; unlocked_at: string; icon: string; rarity: string; [key: string]: unknown }>(
      `SELECT a.name, a.description, ua.unlocked_at, a.icon, a.rarity
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId],
    ),
    // Recent activity logs
    query<{ activity_name: string; duration_min: number | null; calories_burned: number | null; started_at: string; [key: string]: unknown }>(
      `SELECT at.name as activity_name, al.duration_min, al.calories_burned, al.started_at
       FROM activity_logs al
       JOIN activity_types at ON al.activity_type_id = at.id
       WHERE al.user_id = $1
       ORDER BY al.started_at DESC
       LIMIT 20`,
      [userId],
    ),
    // Aggregated stats
    queryOne<{ quests_completed: string; total_activities: string; total_calories: string; articles_read: string; [key: string]: unknown }>(
      `SELECT
         COALESCE((SELECT COUNT(*) FROM quest_instances WHERE user_id = $1 AND status = 'completed'), 0) as quests_completed,
         COALESCE((SELECT COUNT(*) FROM activity_logs WHERE user_id = $1), 0) as total_activities,
         COALESCE((SELECT SUM(calories_burned) FROM activity_logs WHERE user_id = $1), 0) as total_calories,
         COALESCE((SELECT COUNT(*) FROM user_content_progress WHERE user_id = $1), 0) as articles_read`,
      [userId],
    ),
    // Content progress
    query<{ title: string; read_at: string; quiz_score: number | null; xp_earned: number; [key: string]: unknown }>(
      `SELECT ca.title, ucp.read_at, ucp.quiz_score, ucp.xp_earned
       FROM user_content_progress ucp
       JOIN content_articles ca ON ucp.article_id = ca.id
       WHERE ucp.user_id = $1
       ORDER BY ucp.read_at DESC
       LIMIT 10`,
      [userId],
    ),
  ]);

  res.json(successResponse({
    user,
    modes,
    recentQuests,
    achievements,
    recentActivities,
    stats,
    contentProgress,
  }));
}));

/**
 * POST /api/admin/players/:userId/award-xp
 * Award XP to a user (admin action)
 */
router.post('/:userId/award-xp', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (!userId) throw new BadRequestError('Invalid user ID');

  const { amount, reason } = req.body;
  const xpAmount = safeParseInt(amount, 0);
  if (xpAmount <= 0 || xpAmount > 100000) {
    throw new BadRequestError('XP amount must be between 1 and 100000');
  }

  // Verify user exists
  const userCheck = await queryOne<{ id: number; [key: string]: unknown }>(
    'SELECT id FROM users WHERE id = $1',
    [userId],
  );
  if (!userCheck) throw new NotFoundError('User not found');

  // Award XP in a transaction
  const result = await transaction(async (client) => {
    return awardXp(client, userId, xpAmount);
  });

  const adminUser = req.adminUser!;
  await logAuditAction(adminUser.id, 'award_xp', userId, {
    amount: xpAmount,
    reason: reason || 'Admin award',
    result: {
      totalXp: result.totalXp,
      newLevel: result.newLevel,
      leveledUp: result.leveledUp,
    },
  });

  log.info(`Admin ${adminUser.username} awarded ${xpAmount} XP to user ${userId}`, {
    leveledUp: result.leveledUp,
    newLevel: result.newLevel,
  });

  res.json(successResponse({
    message: `Awarded ${xpAmount} XP to user ${userId}`,
    totalXp: result.totalXp,
    newLevel: result.newLevel,
    leveledUp: result.leveledUp,
  }));
}));

/**
 * POST /api/admin/players/:userId/unlock-achievement
 * Unlock an achievement for a user
 */
router.post('/:userId/unlock-achievement', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (!userId) throw new BadRequestError('Invalid user ID');

  const achievementId = safeParseInt(req.body.achievement_id, 0);
  if (!achievementId) throw new BadRequestError('achievement_id is required');

  // Verify user exists
  const userCheck = await queryOne<{ id: number; [key: string]: unknown }>(
    'SELECT id FROM users WHERE id = $1',
    [userId],
  );
  if (!userCheck) throw new NotFoundError('User not found');

  // Verify achievement exists
  const achievement = await queryOne<{ id: number; name: string; [key: string]: unknown }>(
    'SELECT id, name FROM achievements WHERE id = $1',
    [achievementId],
  );
  if (!achievement) throw new NotFoundError('Achievement not found');

  // Check if already unlocked
  const existing = await queryOne<{ id: number; [key: string]: unknown }>(
    'SELECT id FROM user_achievements WHERE user_id = $1 AND achievement_id = $2',
    [userId, achievementId],
  );
  if (existing) {
    throw new BadRequestError(`Achievement "${achievement.name}" is already unlocked for this user`);
  }

  // Unlock achievement
  await execute(
    'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2)',
    [userId, achievementId],
  );

  const adminUser = req.adminUser!;
  await logAuditAction(adminUser.id, 'unlock_achievement', userId, {
    achievement_id: achievementId,
    achievement_name: achievement.name,
  });

  log.info(`Admin ${adminUser.username} unlocked achievement "${achievement.name}" for user ${userId}`);

  res.json(successResponse({
    message: `Achievement "${achievement.name}" unlocked for user ${userId}`,
    achievement_id: achievementId,
    achievement_name: achievement.name,
  }));
}));

/**
 * PATCH /api/admin/players/:userId/tier
 * Change a user's subscription tier
 */
router.patch('/:userId/tier', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (!userId) throw new BadRequestError('Invalid user ID');

  const { tier } = req.body;
  const validTiers = ['free', 'subscriber', 'premium'];
  if (!tier || !validTiers.includes(tier)) {
    throw new BadRequestError(`Invalid tier. Must be one of: ${validTiers.join(', ')}`);
  }

  // Verify user exists
  const userCheck = await queryOne<{ id: number; [key: string]: unknown }>(
    'SELECT id FROM users WHERE id = $1',
    [userId],
  );
  if (!userCheck) throw new NotFoundError('User not found');

  // Upsert subscription
  const subscription = await queryOne<{ tier: string; [key: string]: unknown }>(
    `INSERT INTO subscriptions (user_id, tier, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id) DO UPDATE SET tier = $2, updated_at = NOW()
     RETURNING tier`,
    [userId, tier],
  );

  const adminUser = req.adminUser!;
  await logAuditAction(adminUser.id, 'change_tier', userId, {
    new_tier: tier,
  });

  log.info(`Admin ${adminUser.username} changed tier for user ${userId} to ${tier}`);

  res.json(successResponse({
    message: `Tier changed to "${tier}" for user ${userId}`,
    tier: subscription?.tier || tier,
  }));
}));

/**
 * POST /api/admin/players/:userId/message
 * Send a Telegram message to a user
 */
router.post('/:userId/message', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (!userId) throw new BadRequestError('Invalid user ID');

  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new BadRequestError('Message text is required');
  }

  // Get user's telegram_id
  const user = await queryOne<{ telegram_id: number; [key: string]: unknown }>(
    'SELECT telegram_id FROM users WHERE id = $1',
    [userId],
  );
  if (!user) throw new NotFoundError('User not found');

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    throw new BadRequestError('Bot token not configured');
  }

  // Send message via Telegram Bot API
  const { sent, failed } = await broadcastMessage(botToken, [user.telegram_id], text.trim());

  const adminUser = req.adminUser!;
  await logAuditAction(adminUser.id, 'send_message', userId, {
    text: text.trim().substring(0, 200), // truncate for audit
    sent: sent > 0,
  });

  if (failed > 0) {
    log.warn(`Admin ${adminUser.username} failed to send message to user ${userId}`);
    throw new BadRequestError('Failed to send message. User may have blocked the bot.');
  }

  log.info(`Admin ${adminUser.username} sent message to user ${userId}`);

  res.json(successResponse({
    message: 'Message sent successfully',
    telegram_id: user.telegram_id,
  }));
}));

export { router as adminPlayersRouter };
