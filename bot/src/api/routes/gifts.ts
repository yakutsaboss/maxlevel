/**
 * Gift System Routes (Run 95)
 * Wraps Telegram Bot API sendGift / getAvailableGifts + local gift_received log.
 *
 * GET  /api/gifts/available          — list gifts available from Telegram
 * GET  /api/gifts/received/:userId   — gifts received by a user
 * GET  /api/gifts/sent/:userId       — gifts sent by a user
 * POST /api/gifts/send               — send a gift to another user
 */

import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  validateRequired,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';
import { bot } from '../../bot.js';

const router = Router();

/**
 * GET /api/gifts/available
 * Proxies Telegram's getAvailableGifts, returns simplified list.
 */
router.get('/available', readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const result = await bot.api.getAvailableGifts();

  const gifts = result.gifts.map((g) => ({
    id: g.id,
    title: g.sticker?.emoji ?? '🎁',
    star_count: g.star_count,
    total_count: g.total_count ?? null,
    remaining_count: g.remaining_count ?? null,
    is_premium: g.is_premium ?? false,
    sticker_file_id: g.sticker?.file_id ?? null,
    sticker_file_unique_id: g.sticker?.file_unique_id ?? null,
  }));

  res.json(successResponse(gifts));
}));

/**
 * GET /api/gifts/received/:userId
 * Returns gifts received by a user (newest first).
 */
router.get('/received/:userId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId === 0) throw new BadRequestError('Invalid user ID');

  const limit = safeParseInt(req.query.limit as string, 20);
  const offset = safeParseInt(req.query.offset as string, 0);

  const gifts = await query(
    `SELECT gr.id, gr.gift_id, gr.gift_title, gr.stars_cost, gr.message, gr.sent_at,
            u.username AS from_username, u.first_name AS from_first_name
     FROM gifts_received gr
     JOIN users u ON u.id = gr.from_user_id
     WHERE gr.to_user_id = $1
     ORDER BY gr.sent_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Math.min(limit, 100), Math.max(offset, 0)]
  );

  res.json(successResponse(gifts));
}));

/**
 * GET /api/gifts/sent/:userId
 * Returns gifts sent by a user (newest first).
 */
router.get('/sent/:userId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId === 0) throw new BadRequestError('Invalid user ID');

  const limit = safeParseInt(req.query.limit as string, 20);
  const offset = safeParseInt(req.query.offset as string, 0);

  const gifts = await query(
    `SELECT gr.id, gr.gift_id, gr.gift_title, gr.stars_cost, gr.message, gr.sent_at,
            u.username AS to_username, u.first_name AS to_first_name
     FROM gifts_received gr
     JOIN users u ON u.id = gr.to_user_id
     WHERE gr.from_user_id = $1
     ORDER BY gr.sent_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, Math.min(limit, 100), Math.max(offset, 0)]
  );

  res.json(successResponse(gifts));
}));

/**
 * POST /api/gifts/send
 * Body: { from_user_id, to_user_id, gift_id, message? }
 *
 * Both IDs are internal user IDs. Looks up telegram_id for the recipient,
 * calls bot.api.sendGift(), then records in gifts_received.
 */
router.post('/send', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  validateRequired(req.body, ['from_user_id', 'to_user_id', 'gift_id']);

  const fromUserId = safeParseInt(req.body.from_user_id, 0);
  const toUserId = safeParseInt(req.body.to_user_id, 0);
  const giftId = String(req.body.gift_id || '').trim();
  const message = req.body.message ? String(req.body.message).slice(0, 255) : undefined;

  if (fromUserId === 0) throw new BadRequestError('Invalid from_user_id');
  if (toUserId === 0) throw new BadRequestError('Invalid to_user_id');
  if (!giftId) throw new BadRequestError('gift_id is required');

  // Cannot gift yourself
  if (fromUserId === toUserId) throw new BadRequestError('Cannot send a gift to yourself');

  // Verify sender exists and get their telegram_id
  const fromUser = await queryOne<{ id: number; telegram_id: number }>(
    'SELECT id, telegram_id FROM users WHERE id = $1',
    [fromUserId]
  );
  if (!fromUser) throw new NotFoundError('Sender user not found');

  // Resolve recipient's internal user record + telegram_id
  const toUser = await queryOne<{ id: number; telegram_id: number }>(
    'SELECT id, telegram_id FROM users WHERE id = $1',
    [toUserId]
  );
  if (!toUser) throw new NotFoundError('Recipient user not found');

  // Call Telegram API — sendGift requires the recipient's Telegram ID
  const sendOpts: Record<string, unknown> = {};
  if (message) sendOpts.text = message;

  await bot.api.sendGift(toUser.telegram_id, giftId, sendOpts as Parameters<typeof bot.api.sendGift>[2]);

  // Fetch gift metadata for display title (optional best-effort)
  let giftTitle: string | null = null;
  try {
    const available = await bot.api.getAvailableGifts();
    const found = available.gifts.find((g) => g.id === giftId);
    if (found) giftTitle = found.sticker?.emoji ?? '🎁';
  } catch {
    // non-critical — proceed without title
  }

  // Record in DB
  const record = await queryOne(
    `INSERT INTO gifts_received (to_user_id, from_user_id, gift_id, gift_title, message)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, gift_id, gift_title, message, sent_at`,
    [toUser.id, fromUserId, giftId, giftTitle, message ?? null]
  );

  res.status(201).json(successResponse(record, 'Gift sent successfully'));
}));

export { router as giftRouter };
