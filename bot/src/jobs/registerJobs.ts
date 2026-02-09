/**
 * Job Registration
 * Registers all cron schedules and handlers with pg-boss.
 */

import { PgBoss, type Job, type WorkHandler } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../bot.js';

import * as dailyQuestReset from './definitions/dailyQuestReset.js';
import * as streakCheck from './definitions/streakCheck.js';
import * as questReminders from './definitions/questReminders.js';
import * as leaderboardRefresh from './definitions/leaderboardRefresh.js';
import * as dbCleanup from './definitions/dbCleanup.js';
import * as analyticsExport from './definitions/analyticsExport.js';
import * as dailySummary from './definitions/dailySummary.js';
import * as achievementBatchCheck from './definitions/achievementBatchCheck.js';

interface JobDefinition {
  name: string;
  cron: string;
  handler: WorkHandler<object, void>;
}

const jobs: JobDefinition[] = [
  { name: dailyQuestReset.JOB_NAME, cron: dailyQuestReset.CRON_SCHEDULE, handler: dailyQuestReset.handler },
  { name: streakCheck.JOB_NAME, cron: streakCheck.CRON_SCHEDULE, handler: streakCheck.handler },
  { name: questReminders.JOB_NAME, cron: questReminders.CRON_SCHEDULE, handler: questReminders.handler },
  { name: leaderboardRefresh.JOB_NAME, cron: leaderboardRefresh.CRON_SCHEDULE, handler: leaderboardRefresh.handler },
  { name: dbCleanup.JOB_NAME, cron: dbCleanup.CRON_SCHEDULE, handler: dbCleanup.handler },
  { name: analyticsExport.JOB_NAME, cron: analyticsExport.CRON_SCHEDULE, handler: analyticsExport.handler },
  { name: dailySummary.JOB_NAME, cron: dailySummary.CRON_SCHEDULE, handler: dailySummary.handler },
  { name: achievementBatchCheck.JOB_NAME, cron: achievementBatchCheck.CRON_SCHEDULE, handler: achievementBatchCheck.handler },
];

export async function registerAllJobs(boss: PgBoss, bot: Bot<MyContext>): Promise<void> {
  // Pass bot reference to jobs that need it
  questReminders.setBotInstance(bot);
  dailySummary.setBotInstance(bot);

  for (const job of jobs) {
    await boss.createQueue(job.name);
    await boss.schedule(job.name, job.cron);
    await boss.work(job.name, job.handler);
    console.log(`   [PG-BOSS] Registered: ${job.name} (${job.cron})`);
  }
}

/** Get list of registered job names and schedules (for admin API). */
export function getRegisteredJobs(): Array<{ name: string; cron: string }> {
  return jobs.map(j => ({ name: j.name, cron: j.cron }));
}
