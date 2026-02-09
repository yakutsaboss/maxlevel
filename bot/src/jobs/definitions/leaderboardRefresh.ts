/**
 * Leaderboard Refresh Job
 * Pre-warms the leaderboard cache every 30 minutes with a direct query.
 * Replaces the previous materialized view approach (leaderboard_mv never existed).
 */

import type { Job } from 'pg-boss';
import { query } from '../../utils/db.js';
import { cached, invalidatePrefix, TTL } from '../../utils/cache.js';

export const JOB_NAME = 'leaderboard-refresh';
export const CRON_SCHEDULE = '*/30 * * * *';

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  // Invalidate stale leaderboard cache
  invalidatePrefix('leaderboard:');

  // Pre-warm the cache with fresh data (same query the endpoint uses)
  await cached('leaderboard:50', TTL.SHORT, () =>
    query(
      `SELECT u.id AS user_id, u.telegram_id, u.username, u.first_name,
              u.current_level, u.total_xp,
              COALESCE(s.best_streak, 0) AS best_current_streak,
              COALESCE(qi.total_completed, 0) AS total_quests_completed,
              ROW_NUMBER() OVER (ORDER BY u.total_xp DESC) AS xp_rank,
              ROW_NUMBER() OVER (ORDER BY u.current_level DESC, u.total_xp DESC) AS level_rank
       FROM users u
       LEFT JOIN (
         SELECT user_id, MAX(current_streak) AS best_streak
         FROM streaks GROUP BY user_id
       ) s ON s.user_id = u.id
       LEFT JOIN (
         SELECT user_id, COUNT(*)::int AS total_completed
         FROM quest_instances WHERE status = 'completed'
         GROUP BY user_id
       ) qi ON qi.user_id = u.id
       WHERE u.is_active = true
       ORDER BY u.total_xp DESC
       LIMIT 50`,
      []
    )
  );

  const elapsed = Date.now() - startTime;
  console.log(`[JOB:${JOB_NAME}] Completed in ${elapsed}ms`);
}
