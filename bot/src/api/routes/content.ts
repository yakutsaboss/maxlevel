/**
 * Paid Content Routes
 * Manages premium guides, videos, and resources behind a Telegram Stars paywall.
 * Added in Run 95.
 *
 * Endpoints:
 * - GET  /api/content             — list all active content with user access status
 * - GET  /api/content/:contentId  — get content details (full body only if user has access)
 * - POST /api/content/:contentId/purchase — create Stars invoice for content purchase
 */

import { Router, Request, Response } from 'express';
import { authenticateTelegram } from '../middleware/auth.js';
import { readLimiter, mutationLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute } from '../../utils/db.js';
import {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';
import { bot } from '../../bot.js';
import { logger } from '../../utils/logger.js';

const router = Router();
const log = logger.child({ component: 'content' });

interface PaidContent {
  [key: string]: unknown;
  id: number;
  title: string;
  description: string | null;
  content_type: string;
  price_stars: number;
  content_body: string | null;
  media_file_id: string | null;
  is_active: boolean;
  created_at: string;
}

// GET /api/content — list all active content with user access status
router.get('/', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const telegramId = req.telegramUser!.id;

  // Look up internal user ID for access check
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);

  let items: Array<Omit<PaidContent, 'content_body' | 'media_file_id'> & { has_access: boolean; has_preview: boolean }>;

  if (user) {
    const rows = await query<PaidContent & { has_access: boolean }>(
      `SELECT pc.id, pc.title, pc.description, pc.content_type, pc.price_stars,
              pc.is_active, pc.created_at,
              (uca.id IS NOT NULL) AS has_access,
              (pc.content_body IS NOT NULL) AS has_preview
       FROM paid_content pc
       LEFT JOIN user_content_access uca ON uca.content_id = pc.id AND uca.user_id = $1
       WHERE pc.is_active = true
       ORDER BY pc.created_at DESC`,
      [user.id],
    );
    items = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      content_type: r.content_type,
      price_stars: r.price_stars,
      is_active: r.is_active,
      created_at: r.created_at,
      has_access: Boolean(r.has_access),
      has_preview: Boolean(r.has_preview),
    }));
  } else {
    const rows = await query<PaidContent>(
      `SELECT id, title, description, content_type, price_stars, is_active, created_at,
              (content_body IS NOT NULL) AS has_preview
       FROM paid_content WHERE is_active = true ORDER BY created_at DESC`,
      [],
    );
    items = rows.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      content_type: r.content_type,
      price_stars: r.price_stars,
      is_active: r.is_active,
      created_at: r.created_at,
      has_access: false,
      has_preview: Boolean((r as unknown as Record<string, unknown>).has_preview),
    }));
  }

  res.json(successResponse(items));
}));

// GET /api/content/:contentId — content details (full body only if user has access)
router.get('/:contentId', authenticateTelegram, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const contentId = safeParseInt(req.params.contentId, 0);
  if (contentId <= 0) {
    throw new BadRequestError('Invalid contentId');
  }

  const telegramId = req.telegramUser!.id;
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);

  const item = await queryOne<PaidContent>(
    'SELECT * FROM paid_content WHERE id = $1 AND is_active = true',
    [contentId],
  );

  if (!item) {
    throw new NotFoundError('Content not found');
  }

  let hasAccess = false;
  if (user) {
    const access = await queryOne<{ id: number }>(
      'SELECT id FROM user_content_access WHERE user_id = $1 AND content_id = $2',
      [user.id, contentId],
    );
    hasAccess = !!access;
  }

  res.json(successResponse({
    id: item.id,
    title: item.title,
    description: item.description,
    content_type: item.content_type,
    price_stars: item.price_stars,
    is_active: item.is_active,
    created_at: item.created_at,
    content_body: hasAccess ? item.content_body : null,
    media_file_id: hasAccess ? item.media_file_id : null,
    has_access: hasAccess,
  }));
}));

// POST /api/content/:contentId/purchase — create Stars invoice for content purchase
router.post('/:contentId/purchase', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const contentId = safeParseInt(req.params.contentId, 0);
  if (contentId <= 0) {
    throw new BadRequestError('Invalid contentId');
  }

  const telegramId = req.telegramUser!.id;

  // Look up user
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE telegram_id = $1', [telegramId]);
  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check content exists and is active
  const content = await queryOne<PaidContent>(
    'SELECT * FROM paid_content WHERE id = $1 AND is_active = true',
    [contentId],
  );
  if (!content) {
    throw new NotFoundError('Content not found or inactive');
  }
  if (content.price_stars <= 0) {
    throw new BadRequestError('This content is free — no purchase needed');
  }

  // Check if user already has access
  const existingAccess = await queryOne<{ id: number }>(
    'SELECT id FROM user_content_access WHERE user_id = $1 AND content_id = $2',
    [user.id, contentId],
  );
  if (existingAccess) {
    throw new ConflictError('You already have access to this content');
  }

  // Create pending payment record
  const payment = await queryOne<{ id: number; status: string; created_at: string }>(
    `INSERT INTO payments (user_id, amount, currency, status, provider, metadata)
     VALUES ($1, $2, 'XTR', 'pending', 'telegram_stars', $3)
     RETURNING id, status, created_at`,
    [user.id, content.price_stars, JSON.stringify({ type: 'content_purchase', content_id: contentId })],
  );

  // Create Telegram Stars invoice link
  let invoiceUrl: string;
  try {
    invoiceUrl = await bot.api.createInvoiceLink(
      content.title,
      content.description || `Premium ${content.content_type}: ${content.title}`,
      JSON.stringify({ payment_id: payment!.id, type: 'content_purchase', content_id: contentId }),
      '',     // provider_token: empty for Telegram Stars
      'XTR',  // currency: Telegram Stars
      [{ label: content.title, amount: content.price_stars }],
    );
  } catch (err) {
    log.error('Failed to create content purchase invoice', { paymentId: payment?.id, contentId, error: err });
    await execute(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, [payment!.id]);
    throw new BadRequestError('Failed to create Telegram Stars invoice. Please try again.');
  }

  log.info('Content purchase invoice created', {
    paymentId: payment?.id,
    userId: user.id,
    contentId,
    priceStars: content.price_stars,
  });

  res.status(201).json(successResponse({
    payment_id: payment?.id,
    status: payment?.status,
    amount: content.price_stars,
    currency: 'XTR',
    provider: 'telegram_stars',
    type: 'content_purchase',
    content_id: contentId,
    invoice_url: invoiceUrl,
    created_at: payment?.created_at,
  }, 'Content purchase payment initiated'));
}));

export const contentRouter = router;
