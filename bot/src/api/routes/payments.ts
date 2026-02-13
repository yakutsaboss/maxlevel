/**
 * Payment API Routes
 * Handles Telegram Stars payments, subscription management, and payment history.
 * Provider: Telegram Stars (XTR currency)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, queryOne, execute, transaction } from '../../utils/db.js';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, successResponse, BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { safeParseInt } from '../../utils/validation.js';

const router = Router();
const log = logger.child({ component: 'payments' });

/** Valid subscription tiers */
const VALID_TIERS = ['free', 'subscriber', 'premium'] as const;
type Tier = typeof VALID_TIERS[number];

function isValidTier(tier: string): tier is Tier {
  return VALID_TIERS.includes(tier as Tier);
}

/** Verify Telegram webhook secret token */
function verifyWebhookSecret(req: Request): void {
  const secret = req.headers['x-telegram-bot-api-secret-token'] as string | undefined;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.TELEGRAM_BOT_TOKEN;

  if (!expectedSecret) {
    log.error('Webhook secret not configured');
    throw new UnauthorizedError('Webhook verification not configured');
  }

  if (!secret) {
    log.warn('Webhook call missing secret token', { ip: req.ip });
    throw new UnauthorizedError('Missing webhook secret token');
  }

  // Constant-time comparison to prevent timing attacks
  const secretBuf = Buffer.from(secret);
  const expectedBuf = Buffer.from(expectedSecret);
  if (secretBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(secretBuf, expectedBuf)) {
    log.warn('Webhook call with invalid secret token', { ip: req.ip });
    throw new UnauthorizedError('Invalid webhook secret token');
  }
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

// ─── POST /create ────────────────────────────────────────────────────────────
// Initiate a new payment via Telegram Stars provider
router.post('/create', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { userId, amount, tier } = req.body;

  if (!userId || !amount || !tier) {
    throw new BadRequestError('Missing required fields: userId, amount, tier');
  }

  const numericUserId = typeof userId === 'string' ? safeParseInt(userId, 0) : userId;
  if (!isPositiveInteger(numericUserId)) {
    throw new BadRequestError('userId must be a positive integer');
  }

  if (!isValidTier(tier) || tier === 'free' || tier === 'subscriber') {
    throw new BadRequestError(`Invalid tier for payment: ${tier}. Only 'premium' can be purchased with Stars. Subscribe to @yakutsaway for 'subscriber' tier.`);
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new BadRequestError('Amount must be a positive number');
  }

  // Verify user exists
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  // Create pending payment record
  const payment = await queryOne<{ id: number; status: string; created_at: string }>(
    `INSERT INTO payments (user_id, amount, currency, status, provider, metadata)
     VALUES ($1, $2, 'XTR', 'pending', 'telegram_stars', $3)
     RETURNING id, status, created_at`,
    [userId, numericAmount, JSON.stringify({ tier })],
  );

  log.info('Payment created', { paymentId: payment?.id, userId, amount: numericAmount, tier });

  res.status(201).json(successResponse({
    payment_id: payment?.id,
    status: payment?.status,
    amount: numericAmount,
    currency: 'XTR',
    provider: 'telegram_stars',
    tier,
    created_at: payment?.created_at,
  }, 'Payment initiated'));
}));

// ─── POST /webhook ───────────────────────────────────────────────────────────
// Handle Telegram Stars payment callback (provider webhook)
// NOTE: No authenticateTelegram — webhooks come from Telegram servers, not Mini App.
// Instead, uses secret token verification.
router.post('/webhook', asyncHandler(async (req: Request, res: Response) => {
  // Verify webhook authenticity via secret token
  verifyWebhookSecret(req);

  const { telegram_payment_charge_id, provider_payment_charge_id, payment_id } = req.body;

  if (!telegram_payment_charge_id) {
    throw new BadRequestError('Missing telegram_payment_charge_id');
  }

  if (!payment_id) {
    throw new BadRequestError('Missing payment_id');
  }

  // Look up the pending payment
  const payment = await queryOne<{ id: number; user_id: number; amount: string; status: string; metadata: { tier?: string } }>(
    `SELECT id, user_id, amount, status, metadata FROM payments WHERE id = $1`,
    [payment_id],
  );

  if (!payment) {
    throw new NotFoundError(`Payment ${payment_id} not found`);
  }

  if (payment.status === 'completed') {
    // Idempotent: already processed
    res.json(successResponse({ payment_id: payment.id, status: 'completed' }, 'Payment already processed'));
    return;
  }

  if (payment.status !== 'pending') {
    throw new BadRequestError(`Payment ${payment_id} is in ${payment.status} state, cannot complete`);
  }

  // Complete payment and activate subscription in a single transaction
  const tier = (payment.metadata?.tier as string) || 'premium';

  await transaction(async (client) => {
    // Mark payment as completed with provider charge IDs
    await client.query(
      `UPDATE payments
       SET status = 'completed',
           telegram_payment_charge_id = $1,
           provider_payment_charge_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [telegram_payment_charge_id, provider_payment_charge_id || null, payment_id],
    );

    // Upsert subscription — activate or upgrade
    await client.query(
      `INSERT INTO subscriptions (user_id, tier, started_at, expires_at, auto_renew)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days', true)
       ON CONFLICT (user_id) DO UPDATE
       SET tier = $2,
           started_at = NOW(),
           expires_at = NOW() + INTERVAL '30 days',
           auto_renew = true,
           updated_at = NOW()`,
      [payment.user_id, tier],
    );
  });

  log.info('Payment webhook processed', {
    paymentId: payment_id,
    userId: payment.user_id,
    telegram_payment_charge_id,
    tier,
  });

  res.json(successResponse({
    payment_id: payment.id,
    status: 'completed',
    subscription_tier: tier,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, 'Payment confirmed, subscription activated'));
}));

// ─── GET /history/:userId ────────────────────────────────────────────────────
// List payment history for a user
router.get('/history/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId === 0) {
    throw new BadRequestError('Invalid userId');
  }

  const limit = safeParseInt(req.query.limit as string, 50);
  const offset = safeParseInt(req.query.offset as string, 0);

  const payments = await query(
    `SELECT id, amount, currency, status, provider,
            telegram_payment_charge_id, metadata, created_at, updated_at
     FROM payments
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, limit, offset],
  );

  res.json(successResponse({ payments, count: payments.length }));
}));

// ─── GET /subscription/:userId ───────────────────────────────────────────────
// Get current subscription status for a user
router.get('/subscription/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId === 0) {
    throw new BadRequestError('Invalid userId');
  }

  const sub = await queryOne<{
    id: number;
    tier: string;
    started_at: string;
    expires_at: string | null;
    auto_renew: boolean;
    updated_at: string;
  }>(
    `SELECT id, tier, started_at, expires_at, auto_renew, updated_at
     FROM subscriptions WHERE user_id = $1`,
    [userId],
  );

  if (!sub) {
    // No subscription record — user is on free tier
    res.json(successResponse({
      tier: 'free',
      is_active: true,
      is_expired: false,
    }));
    return;
  }

  const isExpired = sub.expires_at ? new Date(sub.expires_at) < new Date() : false;
  const effectiveTier = isExpired ? 'free' : sub.tier;

  res.json(successResponse({
    subscription_id: sub.id,
    tier: effectiveTier,
    raw_tier: sub.tier,
    is_active: !isExpired,
    is_expired: isExpired,
    started_at: sub.started_at,
    expires_at: sub.expires_at,
    auto_renew: sub.auto_renew,
    updated_at: sub.updated_at,
  }));
}));

// ─── POST /subscription/upgrade ──────────────────────────────────────────────
// Upgrade a user's subscription tier
router.post('/subscription/upgrade', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { userId, tier } = req.body;

  if (!userId || !tier) {
    throw new BadRequestError('Missing required fields: userId, tier');
  }

  const numericUserId = typeof userId === 'string' ? safeParseInt(userId, 0) : userId;
  if (!isPositiveInteger(numericUserId)) {
    throw new BadRequestError('userId must be a positive integer');
  }

  if (!isValidTier(tier) || tier === 'free' || tier === 'subscriber') {
    throw new BadRequestError(`Cannot upgrade to tier: ${tier}. Only 'premium' can be purchased with Stars. Subscribe to @yakutsaway for 'subscriber' tier.`);
  }

  // Verify user exists
  const user = await queryOne<{ id: number }>('SELECT id FROM users WHERE id = $1', [userId]);
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  // Upsert subscription
  const sub = await queryOne<{ id: number; tier: string; expires_at: string }>(
    `INSERT INTO subscriptions (user_id, tier, started_at, expires_at, auto_renew)
     VALUES ($1, $2, NOW(), NOW() + INTERVAL '30 days', true)
     ON CONFLICT (user_id) DO UPDATE
     SET tier = $2,
         started_at = NOW(),
         expires_at = NOW() + INTERVAL '30 days',
         auto_renew = true,
         updated_at = NOW()
     RETURNING id, tier, expires_at`,
    [userId, tier],
  );

  log.info('Subscription upgrade', { userId, newTier: tier, subscriptionId: sub?.id });

  res.json(successResponse({
    subscription_id: sub?.id,
    tier: sub?.tier,
    expires_at: sub?.expires_at,
  }, `Subscription upgraded to ${tier}`));
}));

// ─── POST /subscription/cancel ───────────────────────────────────────────────
// Cancel a user's subscription (set to free tier)
router.post('/subscription/cancel', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    throw new BadRequestError('Missing required field: userId');
  }

  const numericUserId = typeof userId === 'string' ? safeParseInt(userId, 0) : userId;
  if (!isPositiveInteger(numericUserId)) {
    throw new BadRequestError('userId must be a positive integer');
  }

  const sub = await queryOne<{ id: number; tier: string }>(
    `SELECT id, tier FROM subscriptions WHERE user_id = $1`,
    [userId],
  );

  if (!sub || sub.tier === 'free') {
    res.json(successResponse({ tier: 'free' }, 'No active subscription to cancel'));
    return;
  }

  await execute(
    `UPDATE subscriptions
     SET tier = 'free', auto_renew = false, updated_at = NOW()
     WHERE user_id = $1`,
    [userId],
  );

  log.info('Subscription cancel', { userId, previousTier: sub.tier });

  res.json(successResponse({
    previous_tier: sub.tier,
    tier: 'free',
    auto_renew: false,
  }, 'Subscription cancelled'));
}));

// ─── GET /tiers ─────────────────────────────────────────────────────────────
// Return tier info (public endpoint, no auth required)
router.get('/tiers', readLimiter, asyncHandler(async (_req: Request, res: Response) => {
  const tiers = [
    {
      name: 'free' as const,
      modeLimit: 2,
      price: 0,
      purchasable: false,
      channelRequired: false,
      description: 'Default tier for all users',
    },
    {
      name: 'subscriber' as const,
      modeLimit: 3,
      price: 0,
      purchasable: false,
      channelRequired: true,
      channelUsername: 'yakutsaway',
      description: 'Subscribe to @yakutsaway Telegram channel',
    },
    {
      name: 'premium' as const,
      modeLimit: 6,
      price: 599,
      currency: 'XTR',
      purchasable: true,
      channelRequired: false,
      description: 'Premium via Telegram Stars (599/month)',
    },
  ];

  res.json(successResponse({ tiers }));
}));

export { router as paymentsRouter };
