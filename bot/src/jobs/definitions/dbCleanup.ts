/**
 * Database Cleanup Job
 * Purges old data weekly on Sunday at 3 AM UTC.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'db-cleanup';
export const CRON_SCHEDULE = '0 3 * * 0';

export async function handler(jobs: Job[]): Promise<void> {
  console.log(`[JOB] ${JOB_NAME} started`);

  const cleanups = [
    {
      label: 'old quest instances (>90 days)',
      stmt: `DELETE FROM quest_instances WHERE instance_date < CURRENT_DATE - INTERVAL '90 days' AND status IN ('completed', 'failed', 'skipped')`,
    },
    {
      label: 'old punishment history (>180 days)',
      stmt: `DELETE FROM punishment_history WHERE applied_at < NOW() - INTERVAL '180 days'`,
    },
    {
      label: 'stale onboarding states (>7 days)',
      stmt: `DELETE FROM onboarding_state WHERE last_updated < NOW() - INTERVAL '7 days'`,
    },
    {
      label: 'old activity logs (>90 days)',
      stmt: `DELETE FROM user_activity_log WHERE created_at < NOW() - INTERVAL '90 days'`,
    },
  ];

  for (const cleanup of cleanups) {
    const result = await executePythonTool('db_operations', [
      '--execute', cleanup.stmt,
    ]);

    if (result.success) {
      const rows = (result.data as any)?.rows_affected ?? 0;
      console.log(`[JOB] Cleaned ${cleanup.label}: ${rows} rows`);
    } else {
      console.warn(`[JOB] Failed to clean ${cleanup.label}: ${result.error}`);
    }
  }

  console.log(`[JOB] ${JOB_NAME} done`);
}
