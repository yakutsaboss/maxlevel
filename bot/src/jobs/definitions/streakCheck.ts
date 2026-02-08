/**
 * Streak Check Job
 * Checks all streaks and resets broken ones at 1 AM UTC.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'streak-check';
export const CRON_SCHEDULE = '0 1 * * *';

export async function handler(jobs: Job[]): Promise<void> {
  console.log(`[JOB] ${JOB_NAME} started`);

  const result = await executePythonTool('streak_manager', ['--check-all-streaks']);

  if (!result.success) {
    throw new Error(`Streak check failed: ${result.error}`);
  }

  const data = result.data as any;
  console.log(`[JOB] ${JOB_NAME} done: ${data?.broken ?? 0} broken, ${data?.maintained ?? 0} maintained`);
}
