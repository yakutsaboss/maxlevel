import { queryOne } from '../../utils/db.js';
import { LEVEL_XP_DIVISOR } from '../../utils/xpAward.js';

/**
 * Helper: look up user by telegram_id with streak + quest count in ONE query.
 * Replaces 3 separate Python subprocess calls with 1 native SQL query.
 * Shared by users.ts and user-stats.ts.
 */
export async function resolveUser(telegramId: string) {
  const tid = parseInt(telegramId);
  if (isNaN(tid)) return null;

  const u = await queryOne<{ id: number; telegram_id: number; username: string | null; first_name: string | null; avatar_id: number | null; current_level: number; total_xp: number; is_active: boolean; timezone: string; created_at: string; current_streak: number; longest_streak: number; total_quests_completed: number }>(
    `SELECT u.id, u.telegram_id, u.username, u.first_name, u.avatar_id,
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
    avatar_id: u.avatar_id ?? null,
    level: u.current_level,
    xp: u.total_xp,
    xp_to_next_level: u.current_level * LEVEL_XP_DIVISOR,
    total_quests_completed: u.total_quests_completed,
    current_streak: u.current_streak,
    longest_streak: u.longest_streak,
    created_at: u.created_at,
  };
}
