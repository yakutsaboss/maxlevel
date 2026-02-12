/**
 * Smart Quest Recommendation Engine
 *
 * Recommends quests for a user based on their mode, completion history,
 * current streak, and time of day. Ranking priority:
 *   1. Uncompleted quests for today (highest)
 *   2. Streak-maintaining quests (keep the streak alive)
 *   3. XP-optimized picks (maximize rewards)
 */

import { query } from './db.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'questRecommender' });

export interface RecommendedQuest {
  quest_id: number;
  title: string;
  description: string | null;
  quest_type: string;
  xp_reward: number;
  difficulty: string | null;
  reason: 'uncompleted' | 'streak' | 'xp';
  score: number;
}

/**
 * Recommend quests for a user in a given mode.
 *
 * @param userId  - Internal user ID (users.id)
 * @param mode    - Mode name (e.g. 'fitness', 'hydration')
 * @param options - Optional limit (defaults to 5)
 * @returns Ranked list of quest recommendations
 */
export async function recommendQuests(
  userId: number,
  mode: string,
  options?: { limit?: number }
): Promise<RecommendedQuest[]> {
  const limit = options?.limit ?? 5;
  const now = new Date();
  const currentHour = now.getUTCHours();

  log.info('Generating quest recommendations', { userId, mode, limit });

  // 1. Fetch uncompleted quest instances for today
  const uncompleted = await query<{
    quest_id: number;
    title: string;
    description: string | null;
    quest_type: string;
    xp_reward: number;
    difficulty: string | null;
    status: string;
  }>(`
    SELECT q.id AS quest_id, q.title, q.description, q.quest_type,
           q.xp_reward, q.difficulty, qi.status
    FROM quest_instances qi
    JOIN quests q ON qi.quest_id = q.id
    JOIN modes m ON q.mode_id = m.id
    WHERE qi.user_id = $1
      AND m.name = $2
      AND qi.instance_date = CURRENT_DATE
      AND qi.status IN ('pending', 'ready', 'in_progress')
    ORDER BY q.xp_reward DESC
  `, [userId, mode]);

  // 2. Fetch user's current streak for this mode
  const streakRow = await query<{ current_streak: number; last_activity_date: string | null }>(`
    SELECT s.current_streak, s.last_activity_date::text
    FROM streaks s
    JOIN modes m ON s.mode_id = m.id
    WHERE s.user_id = $1 AND m.name = $2
  `, [userId, mode]);

  const currentStreak = streakRow[0]?.current_streak ?? 0;
  const lastActivity = streakRow[0]?.last_activity_date ?? null;

  // 3. Fetch available quest templates not yet assigned today
  const available = await query<{
    quest_id: number;
    title: string;
    description: string | null;
    quest_type: string;
    xp_reward: number;
    difficulty: string | null;
  }>(`
    SELECT q.id AS quest_id, q.title, q.description, q.quest_type,
           q.xp_reward, q.difficulty
    FROM quests q
    JOIN modes m ON q.mode_id = m.id
    WHERE m.name = $2
      AND q.id NOT IN (
        SELECT qi.quest_id FROM quest_instances qi
        WHERE qi.user_id = $1 AND qi.instance_date = CURRENT_DATE
      )
    ORDER BY q.xp_reward DESC
  `, [userId, mode]);

  // 4. Score and rank
  const results: RecommendedQuest[] = [];

  // Uncompleted quests get highest priority (score 300+)
  for (const q of uncompleted) {
    const timeBonus = getTimeBonus(currentHour, q.difficulty);
    results.push({
      quest_id: q.quest_id,
      title: q.title,
      description: q.description,
      quest_type: q.quest_type,
      xp_reward: q.xp_reward,
      difficulty: q.difficulty,
      reason: 'uncompleted',
      score: 300 + q.xp_reward + timeBonus,
    });
  }

  // Streak-maintaining quests (score 200+) — suggest when streak is at risk
  const streakAtRisk = currentStreak > 0 && lastActivity !== todayDateString();
  if (streakAtRisk) {
    for (const q of available) {
      results.push({
        quest_id: q.quest_id,
        title: q.title,
        description: q.description,
        quest_type: q.quest_type,
        xp_reward: q.xp_reward,
        difficulty: q.difficulty,
        reason: 'streak',
        score: 200 + currentStreak * 5 + q.xp_reward,
      });
    }
  }

  // XP-optimized picks from remaining available quests (score 100+)
  for (const q of available) {
    // Avoid duplicating quests already added as streak picks
    if (results.some(r => r.quest_id === q.quest_id)) continue;
    results.push({
      quest_id: q.quest_id,
      title: q.title,
      description: q.description,
      quest_type: q.quest_type,
      xp_reward: q.xp_reward,
      difficulty: q.difficulty,
      reason: 'xp',
      score: 100 + q.xp_reward,
    });
  }

  // Sort descending by score and limit
  results.sort((a, b) => b.score - a.score);
  const recommendations = results.slice(0, limit);

  log.info('Recommendations generated', {
    userId,
    mode,
    count: recommendations.length,
    streakAtRisk,
  });

  return recommendations;
}

/**
 * Apply a time-of-day bonus to quest scores.
 * Morning quests get a boost for early birds; evening for night owls.
 */
function getTimeBonus(hourUtc: number, difficulty: string | null): number {
  // Easy quests favored in the morning (6–11 UTC), hard in the afternoon (14–20)
  if (difficulty === 'easy' && hourUtc >= 6 && hourUtc < 12) return 20;
  if (difficulty === 'hard' && hourUtc >= 14 && hourUtc < 21) return 20;
  if (difficulty === 'medium') return 10;
  return 0;
}

/** Returns today's date as YYYY-MM-DD in UTC. */
function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}
