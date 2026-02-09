/**
 * Database Cleanup Job
 * Purges old data weekly on Sunday at 3 AM UTC.
 *
 * Improvements:
 * - All DELETE operations wrapped in a single transaction
 * - If any fails, all are rolled back
 */

import type { Job } from 'pg-boss';
import { transaction } from '../../utils/db.js';

export const JOB_NAME = 'db-cleanup';
export const CRON_SCHEDULE = '0 3 * * 0';

const CLEANUPS = [
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

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  const results = await transaction(async (client) => {
    const cleanupResults: Array<{ label: string; rows: number }> = [];

    for (const cleanup of CLEANUPS) {
      const result = await client.query(cleanup.stmt);
      const rows = result.rowCount ?? 0;
      cleanupResults.push({ label: cleanup.label, rows });
      console.log(`[JOB:${JOB_NAME}] Cleaned ${cleanup.label}: ${rows} rows`);
    }

    return cleanupResults;
  });

  const totalRows = results.reduce((sum, r) => sum + r.rows, 0);
  const elapsed = Date.now() - startTime;

  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `${results.length} cleanups, ${totalRows} total rows deleted`
  );
}