import { queryOne } from './db.js';

/**
 * Update streak for a user+mode after activity.
 * - If last activity was today (user's timezone) → no change
 * - If last activity was yesterday → increment streak
 * - Otherwise → reset streak to 1
 *
 * Uses a single atomic UPDATE to prevent race conditions under concurrency.
 * Respects user's timezone from the users table for day boundary calculations.
 */
export async function updateStreak(userId: number, modeId: number): Promise<void> {
  await queryOne(
    `UPDATE streaks s
     SET
       current_streak = CASE
         WHEN s.last_activity_date = (CURRENT_TIMESTAMP AT TIME ZONE u.timezone)::date - 1
           THEN s.current_streak + 1
         ELSE 1
       END,
       longest_streak = GREATEST(s.longest_streak, CASE
         WHEN s.last_activity_date = (CURRENT_TIMESTAMP AT TIME ZONE u.timezone)::date - 1
           THEN s.current_streak + 1
         ELSE 1
       END),
       last_activity_date = (CURRENT_TIMESTAMP AT TIME ZONE u.timezone)::date
     FROM users u
     WHERE s.user_id = $1 AND s.mode_id = $2 AND u.id = s.user_id
       AND s.last_activity_date IS DISTINCT FROM (CURRENT_TIMESTAMP AT TIME ZONE u.timezone)::date
     RETURNING s.current_streak`,
    [userId, modeId]
  );
}
