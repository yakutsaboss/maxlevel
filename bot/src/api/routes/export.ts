import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

// ---- Types for export queries ----

interface UserRow {
  [key: string]: unknown;
  id: number;
  username: string | null;
  first_name: string | null;
  current_level: number;
  total_xp: number;
  created_at: string;
}

interface QuestCompletionRow {
  [key: string]: unknown;
  instance_date: string;
  title: string;
  mode_name: string;
  quest_type: string;
  difficulty: string;
  status: string;
  xp_awarded: number;
  completed_at: string | null;
}

interface AchievementRow {
  [key: string]: unknown;
  name: string;
  description: string;
  rarity: string;
  xp_bonus: number;
  unlocked_at: string;
}

interface StreakRow {
  [key: string]: unknown;
  mode_name: string;
  display_name: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

// ---- Helpers ----

/** Fetch all export data for a user. */
async function fetchExportData(userId: number) {
  const user = await queryOne<UserRow>(
    `SELECT id, username, first_name, current_level, total_xp, created_at::text
     FROM users WHERE id = $1`,
    [userId],
  );
  if (!user) return null;

  const [quests, achievements, streaks] = await Promise.all([
    query<QuestCompletionRow>(
      `SELECT qi.instance_date::text, q.title, m.name AS mode_name,
              q.quest_type, q.difficulty, qi.status,
              qi.xp_awarded, qi.completed_at::text
       FROM quest_instances qi
       JOIN quests q ON qi.quest_id = q.id
       JOIN modes m ON q.mode_id = m.id
       WHERE qi.user_id = $1
       ORDER BY qi.instance_date DESC`,
      [userId],
    ),
    query<AchievementRow>(
      `SELECT a.name, a.description, a.rarity, a.xp_bonus,
              ua.unlocked_at::text
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
      [userId],
    ),
    query<StreakRow>(
      `SELECT m.name AS mode_name, m.display_name,
              s.current_streak, s.longest_streak, s.last_activity_date::text
       FROM streaks s
       JOIN modes m ON s.mode_id = m.id
       WHERE s.user_id = $1
       ORDER BY s.current_streak DESC`,
      [userId],
    ),
  ]);

  return { user, quests, achievements, streaks };
}

/** Escape a value for CSV (RFC 4180). */
function csvEscape(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Convert export data to CSV string. */
function toCsv(data: NonNullable<Awaited<ReturnType<typeof fetchExportData>>>): string {
  const lines: string[] = [];

  // User info section
  lines.push('# User Info');
  lines.push('Username,Name,Level,Total XP,Joined');
  lines.push([
    csvEscape(data.user.username),
    csvEscape(data.user.first_name),
    data.user.current_level,
    data.user.total_xp,
    csvEscape(data.user.created_at),
  ].join(','));
  lines.push('');

  // Quest history section
  lines.push('# Quest History');
  lines.push('Date,Quest,Mode,Type,Difficulty,Status,XP,Completed At');
  for (const q of data.quests) {
    lines.push([
      csvEscape(q.instance_date),
      csvEscape(q.title),
      csvEscape(q.mode_name),
      csvEscape(q.quest_type),
      csvEscape(q.difficulty),
      csvEscape(q.status),
      q.xp_awarded,
      csvEscape(q.completed_at),
    ].join(','));
  }
  lines.push('');

  // Achievements section
  lines.push('# Achievements');
  lines.push('Name,Description,Rarity,XP Bonus,Unlocked At');
  for (const a of data.achievements) {
    lines.push([
      csvEscape(a.name),
      csvEscape(a.description),
      csvEscape(a.rarity),
      a.xp_bonus,
      csvEscape(a.unlocked_at),
    ].join(','));
  }
  lines.push('');

  // Streaks section
  lines.push('# Streaks');
  lines.push('Mode,Display Name,Current Streak,Longest Streak,Last Activity');
  for (const s of data.streaks) {
    lines.push([
      csvEscape(s.mode_name),
      csvEscape(s.display_name),
      s.current_streak,
      s.longest_streak,
      csvEscape(s.last_activity_date),
    ].join(','));
  }

  return lines.join('\n');
}

// ---- Routes ----

/**
 * GET /api/export/:userId/csv
 * Export user data as a downloadable CSV file.
 */
router.get('/:userId/csv', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) throw new BadRequestError('Invalid userId');

  const data = await fetchExportData(userId);
  if (!data) throw new NotFoundError('User not found');

  const csv = toCsv(data);
  const filename = `maxlevel_export_${userId}_${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}));

/**
 * GET /api/export/:userId/json
 * Export user data as a downloadable JSON file.
 */
router.get('/:userId/json', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) throw new BadRequestError('Invalid userId');

  const data = await fetchExportData(userId);
  if (!data) throw new NotFoundError('User not found');

  const exportPayload = {
    exported_at: new Date().toISOString(),
    user: {
      username: data.user.username,
      name: data.user.first_name,
      level: data.user.current_level,
      total_xp: data.user.total_xp,
      joined: data.user.created_at,
    },
    quest_history: data.quests.map((q) => ({
      date: q.instance_date,
      quest: q.title,
      mode: q.mode_name,
      type: q.quest_type,
      difficulty: q.difficulty,
      status: q.status,
      xp: q.xp_awarded,
      completed_at: q.completed_at,
    })),
    achievements: data.achievements.map((a) => ({
      name: a.name,
      description: a.description,
      rarity: a.rarity,
      xp_bonus: a.xp_bonus,
      unlocked_at: a.unlocked_at,
    })),
    streaks: data.streaks.map((s) => ({
      mode: s.mode_name,
      display_name: s.display_name,
      current_streak: s.current_streak,
      longest_streak: s.longest_streak,
      last_activity: s.last_activity_date,
    })),
  };

  const filename = `maxlevel_export_${userId}_${new Date().toISOString().slice(0, 10)}.json`;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.json(exportPayload);
}));

export { router as exportRouter };
