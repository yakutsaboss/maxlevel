/**
 * Achievement Batch Check Job
 * Safety net that periodically checks all active users for any missed achievements.
 * Runs every 6 hours. The primary trigger is quest completion (real-time),
 * but this ensures no achievement is left behind.
 */

import type { Job } from 'pg-boss';
import { query } from '../../utils/db.js';
import { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';
import { logger } from '../../api/utils/logger.js';

const log = logger.child({ component: 'achievementBatchCheck' });

export const JOB_NAME = 'achievement-batch-check';
export const CRON_SCHEDULE = '0 */6 * * *';

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  log.info('Started');

  const users = await query<{ id: number }>(
    `SELECT DISTINCT u.id
     FROM users u
     JOIN user_modes um ON um.user_id = u.id AND um.is_active = true
     ORDER BY u.id`
  );

  let totalChecked = 0;
  let totalUnlocked = 0;

  for (let i = 0; i < users.length; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(user => checkAndUnlockAchievements(user.id))
    );

    for (const result of results) {
      totalChecked++;
      if (result.status === 'fulfilled' && result.value.length > 0) {
        totalUnlocked += result.value.length;
      }
    }

    if (i + BATCH_SIZE < users.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const elapsed = Date.now() - startTime;
  log.info(`Completed in ${elapsed}ms`, { totalChecked, totalUnlocked });
}
