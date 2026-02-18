import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, invalidateUserCache, TTL } from '../../utils/cache.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

// ── Type definitions ────────────────────────────────────────────────

interface ActivityType {
  [key: string]: unknown;
  id: number;
  name: string;
  category: string;
  icon_emoji: string | null;
  description: string | null;
  default_duration_min: number | null;
  calories_per_min: number | null;
  requires_timer: boolean;
  requires_gps: boolean;
}

interface ActivityLog {
  [key: string]: unknown;
  id: number;
  user_id: number;
  activity_type_id: number;
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  distance_km: number | null;
  calories_burned: number | null;
  notes: string | null;
  created_at: string;
}

// ── Helper: resolve user ID from telegram_id ────────────────────────

async function resolveUserId(telegramId: number): Promise<number> {
  const user = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE telegram_id = $1 AND is_active = true',
    [telegramId]
  );
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user.id;
}

// ── POST /start — Start a timer-based activity ──────────────────────

router.post('/start', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { telegram_id, activity_type_id } = req.body;
  validateRequired(req.body, ['telegram_id', 'activity_type_id']);

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  const userId = await resolveUserId(tgId);

  // Verify activity type exists
  const activityType = await queryOne<ActivityType>(
    'SELECT id, name FROM activity_types WHERE id = $1',
    [activity_type_id]
  );
  if (!activityType) {
    throw new NotFoundError('Activity type not found');
  }

  // Check for already-running timer (no ended_at)
  const running = await queryOne<{ id: number }>(
    'SELECT id FROM activity_logs WHERE user_id = $1 AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
    [userId]
  );
  if (running) {
    throw new BadRequestError('You already have a running activity. Stop it before starting a new one.');
  }

  const log = await queryOne<ActivityLog>(
    `INSERT INTO activity_logs (user_id, activity_type_id, started_at)
     VALUES ($1, $2, NOW())
     RETURNING id, user_id, activity_type_id, started_at, ended_at, duration_min, calories_burned, notes, created_at`,
    [userId, activity_type_id]
  );

  res.status(201).json(successResponse(log));
}));

// ── POST /stop — Stop a running timer ───────────────────────────────

router.post('/stop', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { telegram_id, activity_log_id } = req.body;
  validateRequired(req.body, ['telegram_id', 'activity_log_id']);

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  const userId = await resolveUserId(tgId);

  // Find the running log
  const log = await queryOne<ActivityLog & { calories_per_min: number | null }>(
    `SELECT al.id, al.user_id, al.activity_type_id, al.started_at, al.ended_at,
            at.calories_per_min
     FROM activity_logs al
     JOIN activity_types at ON al.activity_type_id = at.id
     WHERE al.id = $1 AND al.user_id = $2`,
    [activity_log_id, userId]
  );

  if (!log) {
    throw new NotFoundError('Activity log not found');
  }
  if (log.ended_at) {
    throw new BadRequestError('This activity has already been stopped');
  }

  // Calculate duration and calories
  const startedAt = new Date(log.started_at);
  const endedAt = new Date();
  const durationMs = endedAt.getTime() - startedAt.getTime();
  const durationMin = Math.max(1, Math.round(durationMs / 60000));
  const caloriesBurned = log.calories_per_min
    ? Math.round(log.calories_per_min * durationMin)
    : null;

  const updated = await queryOne<ActivityLog>(
    `UPDATE activity_logs
     SET ended_at = NOW(), duration_min = $1, calories_burned = $2
     WHERE id = $3
     RETURNING id, user_id, activity_type_id, started_at, ended_at, duration_min, distance_km, calories_burned, notes, created_at`,
    [durationMin, caloriesBurned, activity_log_id]
  );

  invalidateUserCache(userId);

  res.json(successResponse(updated));
}));

// ── POST /log — Quick log (no timer) ────────────────────────────────

router.post('/log', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { telegram_id, activity_type_id, duration_min, notes, distance_km } = req.body;
  validateRequired(req.body, ['telegram_id', 'activity_type_id', 'duration_min']);

  const tgId = safeParseInt(telegram_id, 0);
  if (tgId !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  const userId = await resolveUserId(tgId);
  const dur = safeParseInt(duration_min, 0);
  if (dur <= 0) {
    throw new BadRequestError('duration_min must be a positive integer');
  }

  // Verify activity type and get calories_per_min
  const activityType = await queryOne<ActivityType>(
    'SELECT id, calories_per_min FROM activity_types WHERE id = $1',
    [activity_type_id]
  );
  if (!activityType) {
    throw new NotFoundError('Activity type not found');
  }

  const caloriesBurned = activityType.calories_per_min
    ? Math.round(Number(activityType.calories_per_min) * dur)
    : null;

  const log = await queryOne<ActivityLog>(
    `INSERT INTO activity_logs (user_id, activity_type_id, started_at, ended_at, duration_min, calories_burned, notes, distance_km)
     VALUES ($1, $2, NOW() - ($3 || ' minutes')::interval, NOW(), $3, $4, $5, $6)
     RETURNING id, user_id, activity_type_id, started_at, ended_at, duration_min, distance_km, calories_burned, notes, created_at`,
    [userId, activity_type_id, dur, caloriesBurned, notes || null, distance_km || null]
  );

  invalidateUserCache(userId);

  res.status(201).json(successResponse(log));
}));

// ── GET /types — List all activity types grouped by category ────────

router.get('/types', authenticateTelegram, readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const types = await cached<Record<string, ActivityType[]>>('activity_types:all', TTL.MEDIUM, async () => {
    const rows = await query<ActivityType>(
      `SELECT id, name, category, icon_emoji, description, default_duration_min,
              calories_per_min, requires_timer, requires_gps
       FROM activity_types
       ORDER BY category, name`
    );

    // Group by category
    const grouped: Record<string, ActivityType[]> = {};
    for (const row of rows) {
      if (!grouped[row.category]) {
        grouped[row.category] = [];
      }
      grouped[row.category].push(row);
    }
    return grouped;
  });

  res.json(successResponse(types));
}));

// ── GET /:userId/history — Paginated activity history ───────────────

router.get('/:userId/history', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const page = Math.max(1, safeParseInt(req.query.page as string, 1));
  const limit = Math.min(100, Math.max(1, safeParseInt(req.query.limit as string, 20)));
  const offset = (page - 1) * limit;
  const category = req.query.category as string | undefined;
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;

  // Build dynamic WHERE clauses
  const conditions: string[] = ['al.user_id = $1'];
  const params: unknown[] = [userId];
  let paramIdx = 2;

  if (category) {
    conditions.push(`at.category = $${paramIdx}`);
    params.push(category);
    paramIdx++;
  }
  if (from) {
    conditions.push(`al.started_at >= $${paramIdx}::timestamptz`);
    params.push(from);
    paramIdx++;
  }
  if (to) {
    conditions.push(`al.started_at <= $${paramIdx}::timestamptz`);
    params.push(to);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const rows = await query<ActivityLog & { activity_name: string; category: string; icon_emoji: string | null }>(
    `SELECT al.id, al.user_id, al.activity_type_id, al.started_at, al.ended_at,
            al.duration_min, al.distance_km, al.calories_burned, al.notes, al.created_at,
            at.name AS activity_name, at.category, at.icon_emoji
     FROM activity_logs al
     JOIN activity_types at ON al.activity_type_id = at.id
     WHERE ${whereClause}
     ORDER BY al.started_at DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset]
  );

  // Total count for pagination
  const countResult = await queryOne<{ total: string }>(
    `SELECT COUNT(*) AS total
     FROM activity_logs al
     JOIN activity_types at ON al.activity_type_id = at.id
     WHERE ${whereClause}`,
    params
  );
  const total = parseInt(countResult?.total || '0', 10);

  res.json(successResponse({
    activities: rows,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }));
}));

// ── GET /:userId/stats — Activity statistics ────────────────────────

router.get('/:userId/stats', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  // Aggregates: total activities, total time, total calories
  const aggregates = await queryOne<{
    total_activities: string;
    total_duration_min: string;
    total_calories: string;
  }>(
    `SELECT COUNT(*) AS total_activities,
            COALESCE(SUM(duration_min), 0) AS total_duration_min,
            COALESCE(SUM(calories_burned), 0) AS total_calories
     FROM activity_logs
     WHERE user_id = $1 AND ended_at IS NOT NULL`,
    [userId]
  );

  // Favorite activity (most logged)
  const favorite = await queryOne<{ activity_name: string; icon_emoji: string | null; count: string }>(
    `SELECT at.name AS activity_name, at.icon_emoji, COUNT(*) AS count
     FROM activity_logs al
     JOIN activity_types at ON al.activity_type_id = at.id
     WHERE al.user_id = $1 AND al.ended_at IS NOT NULL
     GROUP BY at.id, at.name, at.icon_emoji
     ORDER BY count DESC
     LIMIT 1`,
    [userId]
  );

  // Current streak: consecutive days with at least one completed activity
  const streakRows = await query<{ activity_date: string }>(
    `SELECT DISTINCT DATE(started_at AT TIME ZONE 'UTC') AS activity_date
     FROM activity_logs
     WHERE user_id = $1 AND ended_at IS NOT NULL
     ORDER BY activity_date DESC`,
    [userId]
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  if (streakRows.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let expectedDate = new Date(today);

    // If latest activity isn't today, check if it was yesterday
    const latestDate = new Date(streakRows[0].activity_date);
    latestDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - latestDate.getTime()) / 86400000);

    if (diffDays > 1) {
      currentStreak = 0;
    } else {
      expectedDate = new Date(latestDate);
      for (const row of streakRows) {
        const d = new Date(row.activity_date);
        d.setHours(0, 0, 0, 0);
        const diff = Math.floor((expectedDate.getTime() - d.getTime()) / 86400000);
        if (diff === 0) {
          tempStreak++;
          expectedDate.setDate(expectedDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = tempStreak;
    }

    // Longest streak calculation
    tempStreak = 1;
    longestStreak = 1;
    for (let i = 1; i < streakRows.length; i++) {
      const prev = new Date(streakRows[i - 1].activity_date);
      const curr = new Date(streakRows[i].activity_date);
      prev.setHours(0, 0, 0, 0);
      curr.setHours(0, 0, 0, 0);
      const gap = Math.floor((prev.getTime() - curr.getTime()) / 86400000);
      if (gap === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 1;
      }
    }
  }

  res.json(successResponse({
    total_activities: parseInt(aggregates?.total_activities || '0', 10),
    total_duration_min: parseInt(aggregates?.total_duration_min || '0', 10),
    total_calories: parseInt(aggregates?.total_calories || '0', 10),
    favorite_activity: favorite ? {
      name: favorite.activity_name,
      icon_emoji: favorite.icon_emoji,
      count: parseInt(favorite.count, 10),
    } : null,
    current_streak: currentStreak,
    longest_streak: longestStreak,
  }));
}));

// ── DELETE /:logId — Delete an activity log ─────────────────────────

router.delete('/:logId', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const logId = safeParseInt(req.params.logId, 0);
  if (logId <= 0) {
    throw new BadRequestError('Invalid log ID');
  }

  // Find the log and verify ownership
  const log = await queryOne<{ id: number; user_id: number }>(
    `SELECT al.id, al.user_id
     FROM activity_logs al
     JOIN users u ON al.user_id = u.id
     WHERE al.id = $1 AND u.telegram_id = $2`,
    [logId, req.telegramUser?.id]
  );

  if (!log) {
    throw new NotFoundError('Activity log not found');
  }

  await execute('DELETE FROM activity_logs WHERE id = $1', [logId]);

  invalidateUserCache(log.user_id);

  res.json(successResponse({ deleted: true }));
}));

export { router as activityRouter };
