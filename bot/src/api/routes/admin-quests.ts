/**
 * Admin Quest Template Management Routes
 * GET/POST/PATCH/DELETE quest templates
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/adminAuth.js';
import { query, queryOne, execute } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { buildDynamicUpdate } from '../../utils/sqlBuilder.js';
import { safeParseInt } from '../../utils/validation.js';

const log = logger.child({ component: 'adminQuests' });

const router = Router();

/**
 * GET /api/admin/quests
 * List all quest templates with mode info
 */
router.get('/', requirePermission('quests:read'), asyncHandler(async (req: Request, res: Response) => {
  const modeId = req.query.mode_id ? safeParseInt(req.query.mode_id as string, 0) || null : null;
  const questType = req.query.quest_type as string | undefined;

  let sql = `
    SELECT q.*, m.name AS mode_name, m.display_name AS mode_display_name, m.icon_emoji AS mode_icon
    FROM quests q
    LEFT JOIN modes m ON m.id = q.mode_id
  `;
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (modeId) {
    conditions.push(`q.mode_id = $${paramIdx++}`);
    params.push(modeId);
  }
  if (questType && ['daily', 'weekly'].includes(questType)) {
    conditions.push(`q.quest_type = $${paramIdx++}`);
    params.push(questType);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }
  sql += ' ORDER BY q.mode_id, q.id';

  const quests = await query(sql, params);

  res.json(successResponse({
    quests,
    count: quests.length,
    timestamp: new Date().toISOString(),
  }));
}));

/**
 * POST /api/admin/quests
 * Create a new quest template
 */
router.post('/', requirePermission('quests:create'), asyncHandler(async (req: Request, res: Response) => {
  const {
    mode_id,
    title,
    description,
    quest_type,
    xp_reward,
    difficulty,
    requires_timer,
    timer_window_start,
    timer_window_end,
    readiness_check_enabled,
    readiness_check_time,
    is_mandatory,
  } = req.body;

  if (!title || !quest_type) {
    throw new BadRequestError('Missing required fields: title, quest_type');
  }

  if (!['daily', 'weekly'].includes(quest_type)) {
    throw new BadRequestError('quest_type must be "daily" or "weekly"');
  }

  if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
    throw new BadRequestError('difficulty must be "easy", "medium", or "hard"');
  }

  const quest = await queryOne(
    `INSERT INTO quests (mode_id, title, description, quest_type, xp_reward, difficulty,
       requires_timer, timer_window_start, timer_window_end,
       readiness_check_enabled, readiness_check_time, is_mandatory)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      mode_id || null,
      title,
      description || null,
      quest_type,
      xp_reward ?? 50,
      difficulty || null,
      requires_timer ?? false,
      timer_window_start || null,
      timer_window_end || null,
      readiness_check_enabled ?? false,
      readiness_check_time || null,
      is_mandatory ?? true,
    ]
  );

  const adminUser = req.adminUser!;
  log.info(`Quest template created by ${adminUser.username}`, { questId: quest?.id, title });

  res.status(201).json(successResponse({
    message: 'Quest template created successfully',
    quest,
  }));
}));

/**
 * PATCH /api/admin/quests/:id
 * Update a quest template
 */
router.patch('/:id', requirePermission('quests:update'), asyncHandler(async (req: Request, res: Response) => {
  const questId = safeParseInt(req.params.id, 0);
  const updates = req.body;

  const allowedFields = [
    'mode_id', 'title', 'description', 'quest_type', 'xp_reward', 'difficulty',
    'requires_timer', 'timer_window_start', 'timer_window_end',
    'readiness_check_enabled', 'readiness_check_time', 'is_mandatory',
  ];

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      fields[key] = value;
    }
  }

  if (Object.keys(fields).length === 0) {
    throw new BadRequestError('No valid fields to update');
  }

  // Validate enum fields if provided
  if (fields.quest_type && !['daily', 'weekly'].includes(fields.quest_type as string)) {
    throw new BadRequestError('quest_type must be "daily" or "weekly"');
  }
  if (fields.difficulty && !['easy', 'medium', 'hard'].includes(fields.difficulty as string)) {
    throw new BadRequestError('difficulty must be "easy", "medium", or "hard"');
  }

  const { text, values } = buildDynamicUpdate('quests', fields, 'id = $N', [questId]);

  const updatedQuest = await queryOne(`${text} RETURNING *`, values);

  if (!updatedQuest) {
    throw new NotFoundError('Quest template not found');
  }

  const adminUser = req.adminUser!;
  log.info(`Quest template ${questId} updated by ${adminUser.username}`, { fields: Object.keys(fields) });

  res.json(successResponse({
    message: 'Quest template updated successfully',
    quest: updatedQuest,
  }));
}));

/**
 * DELETE /api/admin/quests/:id
 * Delete a quest template (only if no instances reference it)
 */
router.delete('/:id', requirePermission('quests:delete'), asyncHandler(async (req: Request, res: Response) => {
  const questId = safeParseInt(req.params.id, 0);

  const quest = await queryOne('SELECT id, title FROM quests WHERE id = $1', [questId]);
  if (!quest) {
    throw new NotFoundError('Quest template not found');
  }

  // Check for existing quest instances to prevent orphaned data
  const instanceCount = await queryOne<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM quest_instances WHERE quest_id = $1',
    [questId]
  );

  const count = instanceCount?.count ?? 0;
  if (count > 0) {
    throw new BadRequestError(
      `Cannot delete quest template: ${count} instance(s) reference it. Delete instances first or deactivate the quest instead.`
    );
  }

  await execute('DELETE FROM quests WHERE id = $1', [questId]);

  const adminUser = req.adminUser!;
  log.warn(`Quest template ${questId} ("${quest.title}") DELETED by ${adminUser.username}`);

  res.json(successResponse({
    message: 'Quest template deleted successfully',
    deletedQuest: { id: questId, title: quest.title },
  }));
}));

export { router as adminQuestsRouter };
