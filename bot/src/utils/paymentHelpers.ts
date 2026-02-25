/**
 * Payment Helper Functions
 * Shared validation and utility functions for payment routes.
 */

import crypto from 'crypto';
import { Request } from 'express';
import { UnauthorizedError } from '../api/utils/errors.js';
import { logger } from './logger.js';

const log = logger.child({ component: 'payments' });

/** Valid subscription tiers */
export const VALID_TIERS = ['free', 'subscriber', 'premium'] as const;
export type Tier = typeof VALID_TIERS[number];

/** Prices in Telegram Stars (XTR) for each purchasable tier */
export const TIER_PRICES: Record<Tier, number> = {
  free: 0,
  subscriber: 0,
  premium: 599,
} as const;

export function isValidTier(tier: string): tier is Tier {
  return VALID_TIERS.includes(tier as Tier);
}

/** Verify Telegram webhook secret token */
export function verifyWebhookSecret(req: Request): void {
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

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/**
 * Refund a Telegram Stars payment.
 * Calls bot.api.refundStarPayment and updates the payment record status to 'refunded'.
 */
export async function refundStarPayment(
  botApi: { refundStarPayment: (userId: number, telegramPaymentChargeId: string) => Promise<boolean> },
  userId: number,
  telegramPaymentChargeId: string,
  paymentId?: number,
): Promise<boolean> {
  try {
    await botApi.refundStarPayment(userId, telegramPaymentChargeId);

    if (paymentId) {
      // Lazy import to avoid circular dependency
      const { execute } = await import('./db.js');
      await execute(
        `UPDATE payments SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [paymentId],
      );
    }

    log.info('Star payment refunded', { userId, telegramPaymentChargeId, paymentId });
    return true;
  } catch (err) {
    log.error('Failed to refund star payment', { userId, telegramPaymentChargeId, paymentId, error: err });
    return false;
  }
}
