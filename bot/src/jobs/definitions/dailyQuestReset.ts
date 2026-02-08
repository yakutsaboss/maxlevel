/**
 * Daily Quest Reset Job
 * Assigns new daily quests to all active users at midnight UTC.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'daily-quest-reset';
export const CRON_SCHEDULE = '0 0 * * *';

export async function handler(jobs: Job[]): Promise<void> {
  console.log(`[JOB] ${JOB_NAME} started`);

  // Get all active users
  const usersResult = await executePythonTool('user_manager', [
    '--list-users', '--limit', '10000',
  ]);

  if (!usersResult.success || !Array.isArray(usersResult.data)) {
    throw new Error(`Failed to list users: ${usersResult.error}`);
  }

  let assigned = 0;
  let failed = 0;

  for (const user of usersResult.data) {
    const result = await executePythonTool('quest_manager', [
      '--assign-daily', '--user-id', user.id.toString(), '--count', '3',
    ]);
    if (result.success) {
      assigned++;
    } else {
      failed++;
      console.warn(`[JOB] Failed to assign quests for user ${user.id}: ${result.error}`);
    }
  }

  console.log(`[JOB] ${JOB_NAME} done: ${assigned} assigned, ${failed} failed`);
}
