import { Router, Request, Response } from 'express';
import { authenticateTelegram, requireOwnership } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  validateRequired,
  successResponse,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();

const VALID_FREQUENCIES = ['daily', 'twice_daily', 'three_times', 'weekly', 'as_needed'];

/**
 * GET /api/medications/:telegramId
 * List user's active medications sorted by first time_of_day.
 */
router.get('/:telegramId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, NaN);
  requireOwnership(req);

  if (isNaN(telegramId)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const medications = await query(
    `SELECT m.id, m.name, m.dosage, m.frequency, m.time_of_day, m.color, m.notes, m.created_at
     FROM medications m
     JOIN users u ON m.user_id = u.id
     WHERE u.telegram_id = $1 AND m.is_active = true
     ORDER BY m.time_of_day[1] ASC NULLS LAST, m.name ASC`,
    [telegramId]
  );

  res.json(successResponse({ medications, count: medications.length }));
}));

/**
 * POST /api/medications
 * Add a new medication.
 */
router.post('/', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { telegram_id, name, dosage, frequency, time_of_day, color, notes } = req.body;

  validateRequired(req.body, ['telegram_id', 'name', 'frequency', 'time_of_day']);

  if (safeParseInt(telegram_id, 0) !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  if (!VALID_FREQUENCIES.includes(frequency)) {
    throw new BadRequestError(`Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }

  if (!Array.isArray(time_of_day) || time_of_day.length === 0) {
    throw new BadRequestError('time_of_day must be a non-empty array of time strings');
  }

  // Resolve user_id from telegram_id
  const user = await queryOne<{ id: number }>(
    'SELECT id FROM users WHERE telegram_id = $1',
    [telegram_id]
  );

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const result = await query(
    `INSERT INTO medications (user_id, name, dosage, frequency, time_of_day, color, notes)
     VALUES ($1, $2, $3, $4, $5::TIME[], $6, $7)
     RETURNING id, name, dosage, frequency, time_of_day, color, notes, is_active, created_at`,
    [user.id, name, dosage || null, frequency, time_of_day, color || '#4A90D9', notes || null]
  );

  res.status(201).json(successResponse(result[0]));
}));

/**
 * PATCH /api/medications/:id
 * Edit a medication. Validates ownership via telegram_id in body.
 */
router.patch('/:id', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const medicationId = safeParseInt(req.params.id, NaN);
  const { telegram_id, name, dosage, frequency, time_of_day, color, notes } = req.body;

  if (isNaN(medicationId)) {
    throw new BadRequestError('Invalid medication ID');
  }

  validateRequired(req.body, ['telegram_id']);

  if (safeParseInt(telegram_id, 0) !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  // Verify ownership
  const existing = await queryOne<{ id: number }>(
    `SELECT m.id FROM medications m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1 AND u.telegram_id = $2 AND m.is_active = true`,
    [medicationId, telegram_id]
  );

  if (!existing) {
    throw new NotFoundError('Medication not found or does not belong to this user');
  }

  if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
    throw new BadRequestError(`Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}`);
  }

  if (time_of_day !== undefined && (!Array.isArray(time_of_day) || time_of_day.length === 0)) {
    throw new BadRequestError('time_of_day must be a non-empty array of time strings');
  }

  // Build dynamic SET clause for provided fields only
  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIdx = 1;

  if (name !== undefined) { updates.push(`name = $${paramIdx++}`); values.push(name); }
  if (dosage !== undefined) { updates.push(`dosage = $${paramIdx++}`); values.push(dosage); }
  if (frequency !== undefined) { updates.push(`frequency = $${paramIdx++}`); values.push(frequency); }
  if (time_of_day !== undefined) { updates.push(`time_of_day = $${paramIdx++}::TIME[]`); values.push(time_of_day); }
  if (color !== undefined) { updates.push(`color = $${paramIdx++}`); values.push(color); }
  if (notes !== undefined) { updates.push(`notes = $${paramIdx++}`); values.push(notes); }

  if (updates.length === 0) {
    throw new BadRequestError('No fields to update');
  }

  values.push(medicationId);
  const result = await query(
    `UPDATE medications SET ${updates.join(', ')}
     WHERE id = $${paramIdx}
     RETURNING id, name, dosage, frequency, time_of_day, color, notes, is_active, created_at`,
    values
  );

  res.json(successResponse(result[0]));
}));

/**
 * DELETE /api/medications/:id
 * Soft-delete a medication (set is_active=false). Validates ownership.
 */
router.delete('/:id', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const medicationId = safeParseInt(req.params.id, NaN);
  const { telegram_id } = req.body;

  if (isNaN(medicationId)) {
    throw new BadRequestError('Invalid medication ID');
  }

  validateRequired(req.body, ['telegram_id']);

  if (safeParseInt(telegram_id, 0) !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  // Verify ownership and soft-delete
  const result = await query(
    `UPDATE medications SET is_active = false
     FROM users u
     WHERE medications.user_id = u.id
       AND medications.id = $1
       AND u.telegram_id = $2
       AND medications.is_active = true
     RETURNING medications.id`,
    [medicationId, telegram_id]
  );

  if (result.length === 0) {
    throw new NotFoundError('Medication not found or does not belong to this user');
  }

  res.json(successResponse({ deleted: true, id: medicationId }));
}));

/**
 * GET /api/medications/:telegramId/today
 * Today's schedule: JOIN medications with medication_logs for current date.
 * Returns each med with status (taken/skipped/pending).
 */
router.get('/:telegramId/today', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, NaN);
  requireOwnership(req);

  if (isNaN(telegramId)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  const schedule = await query(
    `SELECT m.id AS medication_id, m.name, m.dosage, m.color, m.frequency,
            t.time_val AS scheduled_time,
            COALESCE(ml.status, 'pending') AS status,
            ml.logged_at
     FROM medications m
     JOIN users u ON m.user_id = u.id
     CROSS JOIN LATERAL unnest(m.time_of_day) AS t(time_val)
     LEFT JOIN medication_logs ml
       ON ml.medication_id = m.id
       AND ml.scheduled_date = CURRENT_DATE
       AND ml.scheduled_time = t.time_val
     WHERE u.telegram_id = $1
       AND m.is_active = true
     ORDER BY t.time_val ASC, m.name ASC`,
    [telegramId]
  );

  const taken = schedule.filter((s: Record<string, unknown>) => s.status === 'taken').length;
  const total = schedule.length;

  res.json(successResponse({
    schedule,
    summary: { taken, total, pending: total - taken },
  }));
}));

export { router as medicationRouter };
