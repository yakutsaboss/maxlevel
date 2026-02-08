/**
 * Analytics Export Job
 * Exports user analytics to Google Sheets every Monday at 6 AM UTC.
 */

import type { Job } from 'pg-boss';
import { executePythonTool } from '../../utils/pythonTools.js';

export const JOB_NAME = 'analytics-export';
export const CRON_SCHEDULE = '0 6 * * 1';

export async function handler(jobs: Job[]): Promise<void> {
  console.log(`[JOB] ${JOB_NAME} started`);

  const result = await executePythonTool('sheets_analytics_export', ['--export-all']);

  if (!result.success) {
    throw new Error(`Analytics export failed: ${result.error}`);
  }

  const data = result.data as any;
  console.log(`[JOB] ${JOB_NAME} done: ${data?.total_rows ?? 0} rows exported to ${data?.sheets_updated?.length ?? 0} sheets`);
}
