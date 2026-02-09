/**
 * Analytics Export Job
 * Exports user analytics to Google Sheets every Monday at 6 AM UTC.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'analytics-export';
export const CRON_SCHEDULE = '0 6 * * 1';

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  console.log(`[JOB:${JOB_NAME}] Started`);

  const result = await executePythonTool('sheets_analytics_export', ['--export-all']);

  if (!result.success) {
    throw new Error(`Analytics export failed: ${result.error}`);
  }

  const data = result.data as any;
  const totalRows = data?.total_rows ?? 0;
  const sheetsUpdated = data?.sheets_updated?.length ?? 0;
  const elapsed = Date.now() - startTime;

  console.log(
    `[JOB:${JOB_NAME}] Completed in ${elapsed}ms — ` +
    `${totalRows} rows exported to ${sheetsUpdated} sheets`
  );
}
