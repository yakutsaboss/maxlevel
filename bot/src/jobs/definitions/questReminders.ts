/**
 * Quest Reminders Job
 * Sends Telegram messages to users with incomplete quests at 6 PM UTC.
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { executePythonTool } from '../../utils/pythonTools.js';

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'quest-reminders';
export const CRON_SCHEDULE = '0 18 * * *';

export async function handler(jobs: Job[]): Promise<void> {
  if (!botRef) throw new Error('Bot instance not set for quest reminders');

  console.log(`[JOB] ${JOB_NAME} started`);

  const result = await executePythonTool('db_operations', [
    '--query',
    `SELECT DISTINCT u.telegram_id, u.first_name, COUNT(qi.id) as pending_count
     FROM quest_instances qi
     JOIN users u ON qi.user_id = u.id
     WHERE qi.instance_date = CURRENT_DATE
       AND qi.status IN ('pending', 'ready', 'in_progress')
       AND u.is_active = true
     GROUP BY u.telegram_id, u.first_name`,
  ]);

  if (!result.success || !Array.isArray(result.data)) {
    console.log(`[JOB] ${JOB_NAME}: no pending quests or query failed`);
    return;
  }

  let sent = 0;
  let failed = 0;

  for (const user of result.data) {
    try {
      await botRef.api.sendMessage(
        user.telegram_id,
        `Hey ${user.first_name || 'there'}! You have ${user.pending_count} quest(s) still waiting today. Don't break your streak! 🔥`
      );
      sent++;
    } catch (err) {
      failed++;
      console.warn(`[JOB] Failed to send reminder to ${user.telegram_id}:`, err);
    }
  }

  console.log(`[JOB] ${JOB_NAME} done: ${sent} sent, ${failed} failed`);
}
