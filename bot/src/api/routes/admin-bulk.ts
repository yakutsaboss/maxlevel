/**
 * Admin Bulk Operations Routes
 * POST /players/bulk/award-xp — Award XP to multiple users
 * POST /players/bulk/tier — Change tier for multiple users
 * POST /players/bulk/message — Send message to multiple users via bot
 */

import { Router, Request, Response } from 'express';
import { requirePermission } from '../middleware/adminAuth.js';
import { query, transaction, getPool } from '../../utils/db.js';
import { awardXp } from '../../utils/xpAward.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
} from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { isValidTier, type Tier } from '../../utils/paymentHelpers.js';

const log = logger.child({ component: 'adminBulk' });

const router = Router();

/**
 * POST /api/admin/players/bulk/award-xp
 * Award XP to multiple users at once.
 * Body: { user_ids: number[], amount: number, reason?: string }
 */
router.post('/players/bulk/award-xp', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const { user_ids, amount, reason } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new BadRequestError('user_ids must be a non-empty array');
  }
  if (typeof amount !== 'number' || amount <= 0 || !Number.isInteger(amount)) {
    throw new BadRequestError('amount must be a positive integer');
  }

  const adminUser = req.adminUser!;
  const results: { userId: number; success: boolean; error?: string }[] = [];

  for (const userId of user_ids) {
    try {
      await transaction(async (client) => {
        await awardXp(client, userId, amount);
      });
      results.push({ userId, success: true });
    } catch (err: any) {
      log.warn(`Bulk award XP failed for user ${userId}`, { error: err.message });
      results.push({ userId, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  log.info(`Bulk XP award by ${adminUser.username}: ${successCount}/${user_ids.length} succeeded`, {
    amount,
    reason: reason || 'none',
  });

  res.json(successResponse({
    processed: user_ids.length,
    succeeded: successCount,
    failed: user_ids.length - successCount,
    results,
  }));
}));

/**
 * POST /api/admin/players/bulk/tier
 * Change subscription tier for multiple users.
 * Body: { user_ids: number[], tier: string }
 */
router.post('/players/bulk/tier', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const { user_ids, tier } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new BadRequestError('user_ids must be a non-empty array');
  }
  if (!tier || !isValidTier(tier)) {
    throw new BadRequestError('tier must be one of: free, subscriber, premium');
  }

  const adminUser = req.adminUser!;

  // Batch update via INSERT ... ON CONFLICT (upsert)
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO subscriptions (user_id, tier, started_at, expires_at)
     SELECT unnest($1::int[]), $2, NOW(), NULL
     ON CONFLICT (user_id) DO UPDATE SET tier = $2, started_at = NOW()`,
    [user_ids, tier]
  );

  const affectedCount = result.rowCount ?? 0;

  log.info(`Bulk tier change by ${adminUser.username}: ${affectedCount} users → ${tier}`, {
    user_ids,
  });

  res.json(successResponse({
    processed: user_ids.length,
    affected: affectedCount,
    tier,
  }));
}));

/**
 * POST /api/admin/players/bulk/message
 * Send a Telegram message to multiple users via the bot API.
 * Body: { user_ids: number[], text: string }
 */
router.post('/players/bulk/message', requirePermission('users:update'), asyncHandler(async (req: Request, res: Response) => {
  const { user_ids, text } = req.body;

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    throw new BadRequestError('user_ids must be a non-empty array');
  }
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new BadRequestError('text must be a non-empty string');
  }

  const adminUser = req.adminUser!;

  // Look up telegram_ids for the given user IDs
  const users = await query<{ id: number; telegram_id: string }>(
    'SELECT id, telegram_id FROM users WHERE id = ANY($1) AND is_active = true',
    [user_ids]
  );

  // Lazy-import bot to avoid TELEGRAM_BOT_TOKEN check at module load time (breaks HTTP tests)
  const { bot } = await import('../../bot.js');

  const results: { userId: number; success: boolean; error?: string }[] = [];

  for (const user of users) {
    try {
      await bot.api.sendMessage(Number(user.telegram_id), text.trim());
      results.push({ userId: user.id, success: true });
    } catch (err: any) {
      log.warn(`Bulk message failed for user ${user.id}`, { error: err.message });
      results.push({ userId: user.id, success: false, error: err.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  log.info(`Bulk message by ${adminUser.username}: ${successCount}/${users.length} sent`, {
    textLength: text.trim().length,
  });

  res.json(successResponse({
    processed: users.length,
    succeeded: successCount,
    failed: users.length - successCount,
    results,
  }));
}));

export { router as adminBulkRouter };
