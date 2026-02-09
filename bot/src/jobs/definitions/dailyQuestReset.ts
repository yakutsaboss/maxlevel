/**
 * Daily Quest Reset Job
 * Assigns new daily quests to all active users at midnight UTC.
 * On Mondays (UTC), also assigns weekly quests.
 *
 * Improvements:
 * - Pagination: processes users in batches of 100
 * - Retry logic: max 3 retries per user with exponential backoff
 * - Logs failed user IDs for debugging
 * - Weekly quest assignment on Mondays
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'daily-quest-reset';
export const CRON_SCHEDULE = '0 0 * * *';

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function assignQuestsWithRetry(userId: number): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await executePythonTool('quest_manager', [
      '--assign-daily', '--user-id', userId.toString(), '--count', '3',
    ]);

    if (result.success) return true;

    if (attempt < MAX_RETRIES) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.warn(`[JOB:${JOB_NAME}] Retry ${attempt}/${MAX_RETRIES} for user ${userId} in ${delay}ms: ${result.error}`);
      await sleep(delay);
    }
  }
  return false;
}

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  let offset = 0;
  let assigned = 0;
  let failed = 0;
  let skipped = 0;
  const failedUserIds: number[] = [];

  while (true) {
    const usersResult = await executePythonTool('user_manager', [
      '--list-users', '--limit', BATCH_SIZE.toString(), '--offset', offset.toString(),
    ]);

    if (!usersResult.success || !Array.isArray(usersResult.data)) {
      if (offset === 0) {
        throw new Error(`Failed to list users: ${usersResult.error}`);
      }
      break; // No more users or error on subsequent batch
    }

    const users = usersResult.data;
    if (users.length === 0) break;

    for (const user of users) {
      const success = await assignQuestsWithRetry(user.id);
      if (success) {
        assigned++;
      } else {
        failed++;
        failedUserIds.push(user.id);
      }
    }

    offset += users.length;

    // If we got fewer than BATCH_SIZE, we've reached the end
    if (users.length < BATCH_SIZE) break;
  }

  // Weekly quest assignment on Mondays (UTC day 1)
  let weeklyAssigned = 0;
  let weeklyFailed = 0;
  const isMonday = new Date().getUTCDay() === 1;

  if (isMonday) {
    console.log(`[JOB:${JOB_NAME}] Monday detected — assigning weekly quests`);

    let weeklyOffset = 0;
    while (true) {
      const usersResult = await executePythonTool('user_manager', [
        '--list-users', '--limit', BATCH_SIZE.toString(), '--offset', weeklyOffset.toString(),
      ]);

      if (!usersResult.success || !Array.isArray(usersResult.data)) break;
      const users = usersResult.data;
      if (users.length === 0) break;

      for (const user of users) {
        const result = await executePythonTool('quest_manager', [
          '--assign-weekly', '--user-id', String(user.id), '--count', '2',
        ]);
        if (result.success) {
          weeklyAssigned++;
        } else {
          weeklyFailed++;
          console.warn(`[JOB:${JOB_NAME}] Weekly quest assignment failed for user ${user.id}: ${result.error}`);
        }
      }

      weeklyOffset += users.length;
      if (users.length < BATCH_SIZE) break;
    }

    console.log(`[JOB:${JOB_NAME}] Weekly quests — assigned: ${weeklyAssigned}, failed: ${weeklyFailed}`);
  }

  const elapsed = Date.now() - startTime;

  if (failedUserIds.length > 0) {
    console.warn(`[JOB:${JOB_NAME}] Failed user IDs: ${failedUserIds.join(', ')}`);
  }

  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `daily assigned: ${assigned}, daily failed: ${failed}, skipped: ${skipped}` +
    (isMonday ? `, weekly assigned: ${weeklyAssigned}, weekly failed: ${weeklyFailed}` : '')
  );
}