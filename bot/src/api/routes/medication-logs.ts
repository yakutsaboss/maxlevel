import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
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

const VALID_STATUSES = ['taken', 'skipped', 'postponed'];

/**
 * POST /api/medication-logs
 * Log taken/skipped/postponed for a medication dose.
 * Uses UPSERT so re-tapping toggles status.
 */
router.post('/', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { telegram_id, medication_id, scheduled_time, status } = req.body;

  validateRequired(req.body, ['telegram_id', 'medication_id', 'scheduled_time', 'status']);

  if (safeParseInt(telegram_id, 0) !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  if (!VALID_STATUSES.includes(status)) {
    throw new BadRequestError(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
  }

  // Verify medication ownership
  const medication = await queryOne<{ id: number; user_id: number }>(
    `SELECT m.id, m.user_id FROM medications m
     JOIN users u ON m.user_id = u.id
     WHERE m.id = $1 AND u.telegram_id = $2 AND m.is_active = true`,
    [medication_id, telegram_id]
  );

  if (!medication) {
    throw new NotFoundError('Medication not found or does not belong to this user');
  }

  // UPSERT: insert or update if same medication + date + time combo exists
  const result = await query(
    `INSERT INTO medication_logs (medication_id, user_id, scheduled_date, scheduled_time, status)
     VALUES ($1, $2, CURRENT_DATE, $3::TIME, $4)
     ON CONFLICT (medication_id, scheduled_date, scheduled_time)
     DO UPDATE SET status = $4, logged_at = NOW()
     RETURNING id, medication_id, scheduled_date, scheduled_time, status, logged_at`,
    [medication_id, medication.user_id, scheduled_time, status]
  );

  res.json(successResponse(result[0]));
}));

/**
 * GET /api/medication-logs/:telegramId/history?days=7
 * Last N days of logs grouped by date, with medication names via JOIN.
 * Calculates adherence rate (taken / total scheduled).
 */
router.get('/:telegramId/history', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = safeParseInt(req.params.telegramId, NaN);

  if (isNaN(telegramId)) {
    throw new BadRequestError('Invalid telegram ID');
  }

  // Ownership check via telegram_id param
  if (telegramId !== req.telegramUser?.id) {
    throw new ForbiddenError('You do not have permission to access this resource');
  }

  const days = Math.min(90, Math.max(1, safeParseInt(req.query.days as string, 7)));

  const logs = await query(
    `SELECT ml.scheduled_date, ml.scheduled_time, ml.status, ml.logged_at,
            m.name AS medication_name, m.dosage, m.color
     FROM medication_logs ml
     JOIN medications m ON ml.medication_id = m.id
     JOIN users u ON ml.user_id = u.id
     WHERE u.telegram_id = $1
       AND ml.scheduled_date >= CURRENT_DATE - $2::INTEGER
     ORDER BY ml.scheduled_date DESC, ml.scheduled_time ASC`,
    [telegramId, days]
  );

  // Group by date
  const grouped: Record<string, Array<Record<string, unknown>>> = {};
  for (const log of logs) {
    const dateKey = String(log.scheduled_date);
    if (!grouped[dateKey]) grouped[dateKey] = [];
    grouped[dateKey].push(log);
  }

  // Calculate adherence
  const totalLogs = logs.length;
  const takenCount = logs.filter((l: Record<string, unknown>) => l.status === 'taken').length;
  const adherenceRate = totalLogs > 0 ? Math.round((takenCount / totalLogs) * 100) : 0;

  res.json(successResponse({
    history: grouped,
    days,
    adherence: {
      taken: takenCount,
      total: totalLogs,
      rate: adherenceRate,
    },
  }));
}));

export { router as medicationLogRouter };
