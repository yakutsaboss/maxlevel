import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

interface Trophy {
  [key: string]: unknown;
  id: number;
  name: string;
  description: string | null;
  icon_emoji: string;
  rarity: string;
  criteria: Record<string, unknown>;
  sort_order: number;
}

interface UserTrophy {
  [key: string]: unknown;
  id: number;
  trophy_id: number;
  name: string;
  description: string | null;
  icon_emoji: string;
  rarity: string;
  criteria: Record<string, unknown>;
  earned_at: string;
}

interface UserStats {
  [key: string]: unknown;
  level: number;
  total_xp: number;
  current_streak: number;
  quests_completed: number;
  friend_count: number;
  achievement_count: number;
  mode_count: number;
  challenge_created: number;
  challenge_wins: number;
  has_purchase: boolean;
  created_at: string;
}

const router = Router();

// GET /api/trophies — List all available trophies (public catalog)
router.get('/', authenticateTelegram, readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const trophies = await query<Trophy>(
    'SELECT id, name, description, icon_emoji, rarity, criteria, sort_order FROM trophies ORDER BY sort_order, id'
  );
  res.json(successResponse(trophies));
}));

// GET /api/trophies/:userId — List earned trophies for a user
router.get('/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  const userExists = await queryOne<{ [key: string]: unknown; id: number }>(
    'SELECT id FROM users WHERE id = $1',
    [userId]
  );
  if (!userExists) {
    throw new NotFoundError('User not found');
  }

  const earned = await query<UserTrophy>(
    `SELECT ut.id, ut.trophy_id, t.name, t.description, t.icon_emoji, t.rarity, t.criteria, ut.earned_at
     FROM user_trophies ut
     JOIN trophies t ON t.id = ut.trophy_id
     WHERE ut.user_id = $1
     ORDER BY ut.earned_at DESC`,
    [userId]
  );

  res.json(successResponse(earned));
}));

// GET /api/trophies/:userId/check — Check and award newly earned trophies
router.get('/:userId/check', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new BadRequestError('Invalid userId');
  }

  // Gather all user stats in one go
  const stats = await queryOne<UserStats>(
    `SELECT
       u.current_level AS level,
       u.total_xp,
       u.created_at,
       COALESCE(MAX(s.current_streak), 0) AS current_streak,
       COALESCE((SELECT COUNT(*) FROM quest_instances qi WHERE qi.user_id = u.id AND qi.status = 'completed'), 0) AS quests_completed,
       COALESCE((SELECT COUNT(*) FROM friend_requests fr
         WHERE (fr.from_user_id = u.id OR fr.to_user_id = u.id) AND fr.status = 'accepted'), 0) AS friend_count,
       COALESCE((SELECT COUNT(*) FROM user_achievements ua WHERE ua.user_id = u.id), 0) AS achievement_count,
       COALESCE((SELECT COUNT(*) FROM user_modes um WHERE um.user_id = u.id AND um.is_active = true), 0) AS mode_count,
       COALESCE((SELECT COUNT(*) FROM challenges c WHERE c.creator_id = u.id), 0) AS challenge_created,
       COALESCE((SELECT COUNT(*) FROM challenge_participants cp
         JOIN challenges ch ON ch.id = cp.challenge_id
         WHERE cp.user_id = u.id AND ch.status = 'completed'), 0) AS challenge_wins,
       EXISTS(SELECT 1 FROM payments p WHERE p.user_id = u.id AND p.status = 'completed') AS has_purchase
     FROM users u
     LEFT JOIN streaks s ON s.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );

  if (!stats) {
    throw new NotFoundError('User not found');
  }

  // Get all trophies that the user has NOT earned yet
  const unearnedTrophies = await query<Trophy>(
    `SELECT t.id, t.name, t.description, t.icon_emoji, t.rarity, t.criteria, t.sort_order
     FROM trophies t
     WHERE t.id NOT IN (SELECT trophy_id FROM user_trophies WHERE user_id = $1)
     ORDER BY t.sort_order`,
    [userId]
  );

  // Check each unearned trophy against user stats
  const newlyAwarded: Trophy[] = [];

  for (const trophy of unearnedTrophies) {
    const criteria = trophy.criteria;
    const type = criteria.type as string;
    const threshold = criteria.threshold;
    let earned = false;

    switch (type) {
      case 'quest_count':
        earned = Number(stats.quests_completed) >= Number(threshold);
        break;
      case 'level':
        earned = Number(stats.level) >= Number(threshold);
        break;
      case 'friend_count':
        earned = Number(stats.friend_count) >= Number(threshold);
        break;
      case 'streak_days':
        earned = Number(stats.current_streak) >= Number(threshold);
        break;
      case 'xp_total':
        earned = Number(stats.total_xp) >= Number(threshold);
        break;
      case 'achievement_count':
        earned = Number(stats.achievement_count) >= Number(threshold);
        break;
      case 'mode_count':
        earned = Number(stats.mode_count) >= Number(threshold);
        break;
      case 'challenge_created':
        earned = Number(stats.challenge_created) >= Number(threshold);
        break;
      case 'challenge_wins':
        earned = Number(stats.challenge_wins) >= Number(threshold);
        break;
      case 'first_purchase':
        earned = Boolean(stats.has_purchase);
        break;
      case 'early_adopter':
        earned = new Date(stats.created_at) < new Date(threshold as string);
        break;
    }

    if (earned) {
      // Award the trophy (INSERT with ON CONFLICT to be safe)
      await queryOne(
        `INSERT INTO user_trophies (user_id, trophy_id) VALUES ($1, $2)
         ON CONFLICT (user_id, trophy_id) DO NOTHING
         RETURNING id`,
        [userId, trophy.id]
      );
      newlyAwarded.push(trophy);
    }
  }

  res.json(successResponse(newlyAwarded));
}));

export const trophyRouter = router;
