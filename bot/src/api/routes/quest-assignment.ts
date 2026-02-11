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

/** Shape returned by the SELECT on the `quests` table for available templates. */
interface QuestTemplate {
  id: number;
  title: string;
  description: string;
  xp_reward: number;
  quest_type: string;
  difficulty: string;
  mode_id: number;
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
  const userId = parseInt(req.params.userId);
  const { frequency, count: requestedCount } = req.body;
  const isDaily = frequency === QUEST_FREQUENCY.DAILY;

  if (!frequency || !Object.values(QUEST_FREQUENCY).includes(frequency)) {
    throw new BadRequestError('Invalid frequency. Must be "daily" or "weekly"');
  }

  const defaultCount = isDaily ? 3 : 2;
  const questCount = requestedCount ? parseInt(requestedCount) : defaultCount;

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

  let available: QuestTemplate[];
  if (isDaily) {
    // Daily: find templates not assigned today
    available = await query<QuestTemplate>(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'daily'
       AND q.id NOT IN (SELECT quest_id FROM quest_instances WHERE user_id = $2 AND instance_date = $3)
       ORDER BY RANDOM() LIMIT $4`,
      [modeIds, userId, today, questCount]
    );
  } else {
    // Weekly: find templates not actively assigned in past 7 days
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    available = await query<QuestTemplate>(
      `SELECT q.id, q.title, q.description, q.xp_reward, q.quest_type, q.difficulty, q.mode_id
       FROM quests q
       WHERE q.mode_id = ANY($1) AND q.quest_type = 'weekly'
       AND q.id NOT IN (
         SELECT quest_id FROM quest_instances
         WHERE user_id = $2 AND instance_date >= $3 AND status IN ('pending', 'ready', 'in_progress')
       )
       ORDER BY RANDOM() LIMIT $4`,
      [modeIds, userId, weekAgo, questCount]
    );
  }

  if (available.length === 0) {
    throw new BadRequestError(`No available ${frequency} quests for user modes`);
  }

  const difficultyTarget: Record<string, number> = { easy: 1, medium: 3, hard: 5 };
  const assigned: AssignedQuest[] = [];

  for (const quest of available) {
    const target = difficultyTarget[quest.difficulty] ?? 1;
    const inst = await queryOne<{ id: number }>(
      `INSERT INTO quest_instances (user_id, quest_id, instance_date, status, target)
       VALUES ($1, $2, $3, 'pending', $4) RETURNING id`,
      [userId, quest.id, today, target]
    );
    if (inst) {
      assigned.push({
        id: inst.id,
        quest_id: quest.id,
        title: quest.title,
        description: quest.description,
        xp_reward: quest.xp_reward,
        quest_type: quest.quest_type,
        difficulty: quest.difficulty,
        target,
        instance_date: today,
        status: 'pending',
      });
    }
  }

  res.json(successResponse({
    message: `${assigned.length} ${frequency} quests assigned successfully`,
    quests: assigned,
  }));
}));

export { router as questAssignmentRouter };
