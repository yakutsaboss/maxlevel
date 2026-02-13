/**
 * Payment Webhook Route
 * Handles Telegram Stars payment callbacks from Telegram servers.
 */

import { Router, Request, Response } from 'express';
import { queryOne, transaction } from '../../utils/db.js';
import { asyncHandler, successResponse, BadRequestError, NotFoundError } from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { verifyWebhookSecret } from '../../utils/paymentHelpers.js';

const router = Router();
const log = logger.child({ component: 'payment-webhook' });

// ─── POST / ─────────────────────────────────────────────────────────────────
// Handle Telegram Stars payment callback (provider webhook)
// NOTE: No authenticateTelegram — webhooks come from Telegram servers, not Mini App.
// Instead, uses secret token verification.
router.post('/', asyncHandler(async (req: Request, res: Response) => {
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

export { router as webhookRouter };
