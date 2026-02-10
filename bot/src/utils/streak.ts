import { queryOne, execute } from './db.js';

/**
 * Update streak for a user+mode after activity.
 * - If last activity was today → no change
 * - If last activity was yesterday → increment streak
 * - Otherwise → reset streak to 1
 */
export async function updateStreak(userId: number, modeId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const streak = await queryOne(
    'SELECT id, current_streak, longest_streak, last_activity_date FROM streaks WHERE user_id = $1 AND mode_id = $2',
    [userId, modeId]
  );
  if (!streak) return;
  const lastDate = streak.last_activity_date
    ? new Date(streak.last_activity_date).toISOString().split('T')[0]
    : null;
  if (lastDate === today) return;
  const newStreak = lastDate === yesterday ? streak.current_streak + 1 : 1;
  const newLongest = Math.max(streak.longest_streak, newStreak);
  await execute(
    'UPDATE streaks SET current_streak = $1, longest_streak = $2, last_activity_date = $3 WHERE user_id = $4 AND mode_id = $5',
    [newStreak, newLongest, today, userId, modeId]
  );
}
