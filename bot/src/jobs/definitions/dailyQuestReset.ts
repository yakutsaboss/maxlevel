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
import { query, execute } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

type ModeIdRow = {
  mode_id: number;
};

type QuizResponsesRow = {
  quiz_responses: Record<string, unknown> | null;
};

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

const log = logger.child({ component: 'dailyQuestReset' });

/**
 * Get the user's fitness level from quiz_responses in mode_configs.
 * Falls back to 'beginner' if not set.
 */
async function getUserFitnessLevel(userId: number, modeIds: number[]): Promise<FitnessLevel> {
  const row = await query<QuizResponsesRow>(
    'SELECT quiz_responses FROM mode_configs WHERE user_id = $1 AND mode_id = ANY($2) AND quiz_responses IS NOT NULL LIMIT 1',
    [userId, modeIds]
  );
  if (row.length === 0 || !row[0].quiz_responses) return 'beginner';
  const level = String((row[0].quiz_responses as Record<string, unknown>).fitness_level || 'beginner');
  if (level === 'intermediate' || level === 'advanced') return level;
  return 'beginner';
}

/**
 * Build SQL ORDER BY clause that biases quest selection toward difficulties
 * appropriate for the user's fitness level.
 */
function getDifficultyFilter(level: FitnessLevel): { whereClause: string; orderClause: string } {
  switch (level) {
    case 'beginner':
      return {
        whereClause: "AND q.difficulty IN ('easy','medium')",
        orderClause: "ORDER BY CASE WHEN q.difficulty='easy' THEN 0 ELSE 1 END, RANDOM()",
      };
    case 'advanced':
      return {
        whereClause: "AND q.difficulty IN ('medium','hard')",
        orderClause: "ORDER BY CASE WHEN q.difficulty='hard' THEN 0 ELSE 1 END, RANDOM()",
      };
    case 'intermediate':
    default:
      return {
        whereClause: '',
        orderClause: 'ORDER BY RANDOM()',
      };
  }
}

export const JOB_NAME = 'daily-quest-reset';
export const CRON_SCHEDULE = '0 0 * * *';

const BATCH_SIZE = 100;
const MAX_RETRIES = 3;

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function assignDailyQuestsWithRetry(userId: number): Promise<boolean> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. Get user's active modes
      const modes = await query<ModeIdRow>('SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true', [userId]);
      if (modes.length === 0) return true; // no modes — not a failure
      const modeIds = modes.map(m => m.mode_id);
      const today = new Date().toISOString().split('T')[0];

      // 2. Get fitness level and build difficulty bias
      const fitnessLevel = await getUserFitnessLevel(userId, modeIds);
      const { whereClause, orderClause } = getDifficultyFilter(fitnessLevel);

      // 3. Find available daily templates not assigned today, biased by fitness level
      const templates = await query(
        `SELECT q.* FROM quests q
         WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
         AND q.id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
         ${whereClause}
         ${orderClause} LIMIT $4`,
        [modeIds, userId, today, 3]
      );

      // 3. Assign each
      for (const t of templates) {
        const target = { easy: 1, medium: 3, hard: 5 }[t.difficulty as string] || 1;
        await execute(
          `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
           VALUES ($1, $2, $3, 'pending', $4)
           ON CONFLICT (user_id, quest_id, instance_date) DO NOTHING`,
          [userId, t.id, today, target]
        );
      }

      return true;
    } catch (err: unknown) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        log.warn(`Retry ${attempt}/${MAX_RETRIES} for user ${userId} in ${delay}ms: ${err instanceof Error ? err.message : String(err)}`);
        await sleep(delay);
      }
    }
  }
  return false;
}

async function assignWeeklyQuests(userId: number): Promise<boolean> {
  try {
    // 1. Get user's active modes
    const modes = await query<ModeIdRow>('SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true', [userId]);
    if (modes.length === 0) return true; // no modes — not a failure
    const modeIds = modes.map(m => m.mode_id);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // 2. Get fitness level and build difficulty bias
    const fitnessLevel = await getUserFitnessLevel(userId, modeIds);
    const { whereClause, orderClause } = getDifficultyFilter(fitnessLevel);

    // 3. Find available weekly templates not assigned in the last 7 days, biased by fitness level
    const templates = await query(
      `SELECT q.* FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'weekly'
       AND q.id NOT IN (
         SELECT quest_id FROM quest_instances
         WHERE user_id = $2 AND instance_date >= $3
         AND status IN ('pending', 'ready', 'in_progress')
       )
       ${whereClause}
       ${orderClause} LIMIT $4`,
      [modeIds, userId, weekAgo, 2]
    );

    // 3. Assign each
    const today = new Date().toISOString().split('T')[0];
    for (const t of templates) {
      const target = { easy: 1, medium: 3, hard: 5 }[t.difficulty as string] || 1;
      await execute(
        `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
         VALUES ($1, $2, $3, 'pending', $4)
         ON CONFLICT (user_id, quest_id, instance_date) DO NOTHING`,
        [userId, t.id, today, target]
      );
    }

    return true;
  } catch (err: unknown) {
    return false;
  }
}

export async function handler(jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  log.info('Started');

  let offset = 0;
  let assigned = 0;
  let failed = 0;
  let skipped = 0;
  const failedUserIds: number[] = [];

  while (true) {
    const users = await query<{ id: number }>(
      'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [BATCH_SIZE, offset]
    );

    if (users.length === 0) break;

    for (const user of users) {
      const success = await assignDailyQuestsWithRetry(user.id);
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
    log.info('Monday detected — assigning weekly quests');

    let weeklyOffset = 0;
    while (true) {
      const users = await query<{ id: number }>(
        'SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [BATCH_SIZE, weeklyOffset]
      );

      if (users.length === 0) break;

      for (const user of users) {
        const success = await assignWeeklyQuests(user.id);
        if (success) {
          weeklyAssigned++;
        } else {
          weeklyFailed++;
          log.warn(`Weekly quest assignment failed for user ${user.id}`);
        }
      }

      weeklyOffset += users.length;
      if (users.length < BATCH_SIZE) break;
    }

    log.info('Weekly quests complete', { weeklyAssigned, weeklyFailed });
  }

  const elapsed = Date.now() - startTime;

  if (failedUserIds.length > 0) {
    log.warn('Failed user IDs', { failedUserIds });
  }

  log.info(`Completed in ${elapsed}ms`, {
    dailyAssigned: assigned, dailyFailed: failed, skipped,
    ...(isMonday ? { weeklyAssigned, weeklyFailed } : {}),
  });

  // Set target for newly assigned quests that still have the default target=1
  const updatedTargets = await execute(`
    UPDATE quest_instances qi
    SET target = CASE
      WHEN q.difficulty = 'easy' THEN 1
      WHEN q.difficulty = 'medium' THEN 3
      WHEN q.difficulty = 'hard' THEN 5
      ELSE 1
    END
    FROM quests q
    WHERE qi.quest_id = q.id AND qi.instance_date = CURRENT_DATE AND qi.target = 1
  `);
  log.info(`Updated targets for ${updatedTargets} quest instances`);
}
