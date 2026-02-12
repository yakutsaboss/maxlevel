/**
 * Streak Check Job
 * Checks all streaks and resets broken ones at 1 AM UTC.
 *
 * Improvements:
 * - Logs which specific streaks broke (user_id, mode_id, previous_streak)
 */

import type { Job } from 'pg-boss';
import { query, execute } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'streakCheck' });

export const JOB_NAME = 'streak-check';
export const CRON_SCHEDULE = '0 1 * * *';

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  log.info('Started');

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Get all active streaks that might be broken
  const activeStreaks = await query<{ id: number; user_id: number; mode_id: number; current_streak: number; longest_streak: number; last_activity_date: string | null; telegram_id: number; first_name: string | null }>(`
    SELECT s.id, s.user_id, s.mode_id, s.current_streak, s.longest_streak,
           s.last_activity_date, u.telegram_id, u.first_name
    FROM streaks s
    JOIN users u ON u.id = s.user_id
    WHERE u.is_active = true AND s.current_streak > 0
  `);

  let broken = 0;
  let maintained = 0;
  const brokenDetails: { user_id: number; telegram_id: number; mode_id: number; was_streak: number }[] = [];

  for (const streak of activeStreaks) {
    const lastDate = streak.last_activity_date
      ? new Date(streak.last_activity_date).toISOString().split('T')[0]
      : null;
    if (lastDate === null || lastDate < yesterday) {
      await execute('UPDATE streaks SET current_streak = 0 WHERE id = $1', [streak.id]);
      broken++;
      brokenDetails.push({
        user_id: streak.user_id,
        telegram_id: streak.telegram_id,
        mode_id: streak.mode_id,
        was_streak: streak.current_streak,
      });
    } else {
      maintained++;
    }
  }

  // Log details of broken streaks
  if (brokenDetails.length > 0) {
    log.info('Broken streak details', { brokenDetails });
  }

  const elapsed = Date.now() - startTime;
  log.info(`Completed in ${elapsed}ms`, { broken, maintained });
}
