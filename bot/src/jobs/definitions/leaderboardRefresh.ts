/**
 * Leaderboard Refresh Job
 * Refreshes the leaderboard materialized view every 30 minutes.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'leaderboard-refresh';
export const CRON_SCHEDULE = '*/30 * * * *';

export async function handler(jobs: Job[]): Promise<void> {
  console.log(`[JOB] ${JOB_NAME} started`);

  const result = await executePythonTool('db_operations', [
    '--execute',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_mv',
  ]);

  if (!result.success) {
    throw new Error(`Leaderboard refresh failed: ${result.error}`);
  }

  console.log(`[JOB] ${JOB_NAME} done`);
}
