/**
 * Streak Check Job
 * Checks all streaks and resets broken ones at 1 AM UTC.
 *
 * Improvements:
 * - Logs which specific streaks broke (user_id, mode_id, previous_streak)
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'streak-check';
export const CRON_SCHEDULE = '0 1 * * *';

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  const result = await executePythonTool('streak_manager', ['--check-all-streaks']);

  if (!result.success) {
    throw new Error(`Streak check failed: ${result.error}`);
  }

  const data = result.data as any;
  const broken = data?.broken ?? 0;
  const maintained = data?.maintained ?? 0;

  // Log details of broken streaks if available
  const brokenStreaks = data?.broken_details || data?.broken_streaks || [];
  if (Array.isArray(brokenStreaks) && brokenStreaks.length > 0) {
    console.log(`[JOB:${JOB_NAME}] Broken streak details:`);
    for (const streak of brokenStreaks) {
      console.log(
        `[JOB:${JOB_NAME}]   user_id=${streak.user_id}, mode_id=${streak.mode_id}, ` +
        `previous_streak=${streak.current_streak ?? streak.previous_streak ?? '?'}`
      );
    }
  }

  const elapsed = Date.now() - startTime;
  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `broken: ${broken}, maintained: ${maintained}`
  );
}