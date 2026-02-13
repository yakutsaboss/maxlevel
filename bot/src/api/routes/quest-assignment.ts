import { Router, Request, Response } from 'express';
import {
  authenticateTelegram,
  authorizeUser,
  mutationLimiter,
  query,
  queryOne,
  QUEST_FREQUENCY,
  asyncHandler,
  successResponse,
  BadRequestError,
} from './quest-helpers.js';
import { safeParseInt } from '../../utils/validation.js';

/** Shape returned by the SELECT on the `quests` table for available templates. */
type QuestTemplate = {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: string;
  difficulty: string;
  mode_id: number;
};

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Get the user's fitness level from quiz_responses in mode_configs.
 * Falls back to 'beginner' if not set.
 */
async function getUserFitnessLevel(userId: number, modeIds: number[]): Promise<FitnessLevel> {
  const rows = await query<{ quiz_responses: Record<string, unknown> | null }>(
    'SELECT quiz_responses FROM mode_configs WHERE user_id = $1 AND mode_id = ANY($2) AND quiz_responses IS NOT NULL LIMIT 1',
    [userId, modeIds]
  );
  if (rows.length === 0 || !rows[0].quiz_responses) return 'beginner';
  const level = String(rows[0].quiz_responses.fitness_level || 'beginner');
  if (level === 'intermediate' || level === 'advanced') return level;
  return 'beginner';
}

/**
 * Build SQL clauses that bias quest selection toward difficulties
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

/** Shape of each quest pushed into the response after INSERT. */
interface AssignedQuest {
  id: number;
  quest_id: number;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: string;
  difficulty: string;
  target: number;
  instance_date: string;
  status: string;
}

const router = Router();

/**
 * POST /api/users/:userId/quests/assign
 * Assign new quests to user (daily/weekly)
 */
router.post('/users/:userId/assign', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  const { frequency, count: requestedCount } = req.body;
  const isDaily = frequency === QUEST_FREQUENCY.DAILY;

  if (!frequency || !Object.values(QUEST_FREQUENCY).includes(frequency)) {
    throw new BadRequestError('Invalid frequency. Must be "daily" or "weekly"');
  }

  const defaultCount = isDaily ? 3 : 2;
  const questCount = requestedCount ? safeParseInt(String(requestedCount), defaultCount) : defaultCount;

  // Get user's active modes
  const modeRows = await query<{ mode_id: number }>(
    'SELECT mode_id FROM user_modes WHERE user_id = $1 AND is_active = true',
    [userId]
  );
  const modeIds = modeRows.map(r => r.mode_id);
  if (modeIds.length === 0) {
    throw new BadRequestError('User has no active modes');
  }

  const today = new Date().toISOString().split('T')[0];

  // Get fitness level to bias quest difficulty selection
  const fitnessLevel = await getUserFitnessLevel(userId, modeIds);
  const { whereClause, orderClause } = getDifficultyFilter(fitnessLevel);

  let available: QuestTemplate[];
  if (isDaily) {
    // Daily: find templates not assigned today, biased by fitness level
    available = await query<QuestTemplate>(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
       AND q.id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
       ${whereClause}
       ${orderClause} LIMIT $4`,
      [modeIds, userId, today, questCount]
    );
  } else {
    // Weekly: find templates not actively assigned in past 7 days, biased by fitness level
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    available = await query<QuestTemplate>(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'weekly'
       AND q.id NOT IN (
         SELECT quest_id FROM quest_instances
         WHERE user_id = $2 AND instance_date >= $3 AND status IN ('pending', 'ready', 'in_progress')
       )
       ${whereClause}
       ${orderClause} LIMIT $4`,
      [modeIds, userId, weekAgo, questCount]
    );
  }

  if (available.length === 0) {
    throw new BadRequestError(`No available ${frequency} quests for user modes`);
  }

  const difficultyTarget: Record<string, number> = { easy: 1, medium: 3, hard: 5 };

  // Batch INSERT all quest instances in a single query
  const values: unknown[] = [];
  const placeholders: string[] = [];
  const questTargets: { quest: QuestTemplate; target: number }[] = [];

  for (let i = 0; i < available.length; i++) {
    const quest = available[i];
    const target = difficultyTarget[quest.difficulty] ?? 1;
    questTargets.push({ quest, target });
    const offset = i * 4;
    placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, 'pending', $${offset + 4})`);
    values.push(userId, quest.id, today, target);
  }

  const inserted = await query<{ id: number; quest_id: number }>(
    `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
     VALUES ${placeholders.join(', ')}
     RETURNING id, quest_id`,
    values
  );

  const insertedMap = new Map(inserted.map(r => [r.quest_id, r.id]));
  const assigned: AssignedQuest[] = questTargets.map(({ quest, target }) => ({
    id: insertedMap.get(quest.id)!,
    quest_id: quest.id,
    title: quest.title,
    description: quest.description,
    xp_reward: quest.xp_reward,
    quest_type: quest.quest_type,
    difficulty: quest.difficulty,
    target,
    instance_date: today,
    status: 'pending',
  }));

  res.json(successResponse({
    message: `${assigned.length} ${frequency} quests assigned successfully`,
    quests: assigned,
  }));
}));

export { router as questAssignmentRouter };
