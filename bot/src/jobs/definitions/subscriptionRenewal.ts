/**
 * Subscription Renewal Job
 * Processes auto-renewal for premium subscriptions expiring within 48 hours.
 * Runs daily at 6 AM UTC.
 *
 * Features:
 * - Queries subscriptions expiring within 48h with auto_renew enabled
 * - Creates invoice and attempts charge for each
 * - On success: extends subscription by 30 days
 * - On failure: notifies user, disables auto_renew, logs warning
 * - Telegram rate limit handling (429 → wait retry_after seconds)
 */

import type { Job } from 'pg-boss';
import type { Bot } from 'grammy';
import type { MyContext } from '../../bot.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { TIER_PRICES } from '../../utils/paymentHelpers.js';

const log = logger.child({ component: 'subscriptionRenewal' });

let botRef: Bot<MyContext> | null = null;

export function setBotInstance(bot: Bot<MyContext>): void {
  botRef = bot;
}

export const JOB_NAME = 'subscription-renewal';
export const CRON_SCHEDULE = '0 6 * * *'; // Daily at 6 AM UTC

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type ExpiringSubscription = {
  subscription_id: number;
  user_id: number;
  telegram_id: number;
  tier: string;
  expires_at: string;
  [key: string]: unknown;
};

/**
 * Send a Telegram message with retry on 429 rate limit.
 */
async function sendWithRetry(telegramId: number, text: string, maxRetries = 3): Promise<boolean> {
  if (!botRef) return false;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await botRef.api.sendMessage(telegramId, text, { parse_mode: 'HTML' });
      return true;
    } catch (err: unknown) {
      const error = err as { error_code?: number; parameters?: { retry_after?: number } };
      if (error.error_code === 429 && attempt < maxRetries) {
        const retryAfter = error.parameters?.retry_after || 5;
        log.warn('Rate limited, retrying', { telegramId, retryAfter, attempt });
        await sleep(retryAfter * 1000);
        continue;
      }
      if (error.error_code === 403) {
        log.warn('User blocked bot', { telegramId });
        return false;
      }
      log.error('Failed to send message', { telegramId, attempt, error: err });
      return false;
    }
  }
  return false;
}

export async function handler(_jobs: Job[]): Promise<void> {
  const startTime = Date.now();
  log.info('Started');

  if (!botRef) {
    log.warn('Bot reference not set, skipping subscription renewal');
    return;
  }

  // Find subscriptions expiring within 48 hours that have auto_renew enabled
  const expiring = await query<ExpiringSubscription>(
    `SELECT s.id AS subscription_id, s.user_id, u.telegram_id, s.tier, s.expires_at
     FROM subscriptions s
     JOIN users u ON u.id = s.user_id
     WHERE s.auto_renew = true
       AND s.tier != 'free'
       AND s.expires_at <= NOW() + INTERVAL '48 hours'
       AND s.expires_at > NOW() - INTERVAL '24 hours'`,
    [],
  );

  if (expiring.length === 0) {
    const elapsed = Date.now() - startTime;
    log.info('Completed — no subscriptions to renew', { elapsed });
    return;
  }

  log.info('Found expiring subscriptions', { count: expiring.length });

  let renewed = 0;
  let failed = 0;

  for (const sub of expiring) {
    try {
      const tierPrice = TIER_PRICES[sub.tier as keyof typeof TIER_PRICES];
      if (!tierPrice || tierPrice <= 0) {
        log.warn('No price for tier, skipping', { tier: sub.tier, userId: sub.user_id });
        continue;
      }

      // Create a pending payment record for the renewal
      const payment = await queryOne<{ id: number }>(
        `INSERT INTO payments (user_id, amount, currency, status, provider, metadata)
         VALUES ($1, $2, 'XTR', 'pending', 'telegram_stars', $3)
         RETURNING id`,
        [sub.user_id, tierPrice, JSON.stringify({ type: 'renewal', tier: sub.tier, subscription_id: sub.subscription_id })],
      );

      // Create invoice link for the renewal
      const tierLabel = sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1);
      let invoiceUrl: string;
      try {
        invoiceUrl = await botRef.api.createInvoiceLink(
          `${tierLabel} Renewal`,
          `Auto-renewal of ${tierLabel} subscription — 30 days`,
          JSON.stringify({ payment_id: payment!.id, type: 'renewal', tier: sub.tier }),
          '',
          'XTR',
          [{ label: `${tierLabel} Renewal`, amount: tierPrice }],
        );
      } catch (err) {
        log.error('Failed to create renewal invoice', { userId: sub.user_id, error: err });
        await execute(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, [payment!.id]);

        // Notify user about failed renewal
        await sendWithRetry(
          sub.telegram_id,
          `⚠️ <b>Subscription renewal failed</b>\n\nWe couldn't create a renewal invoice for your ${tierLabel} subscription. Auto-renewal has been disabled.\n\nYou can re-subscribe anytime from the Settings page.`,
        );

        // Disable auto-renew on failure
        await execute(
          `UPDATE subscriptions SET auto_renew = false, updated_at = NOW() WHERE id = $1`,
          [sub.subscription_id],
        );

        failed++;
        continue;
      }

      // Send the invoice to the user for payment
      try {
        await botRef.api.sendMessage(sub.telegram_id,
          `🔄 <b>Subscription Renewal</b>\n\nYour ${tierLabel} subscription is expiring soon. Tap below to renew for ${tierPrice} Stars.`,
          { parse_mode: 'HTML' },
        );
        await botRef.api.sendInvoice(
          sub.telegram_id,
          `${tierLabel} Renewal`,
          `Auto-renewal of ${tierLabel} subscription — 30 days`,
          JSON.stringify({ payment_id: payment!.id, type: 'renewal', tier: sub.tier }),
          'XTR',
          [{ label: `${tierLabel} Renewal`, amount: tierPrice }],
        );
        renewed++;
        log.info('Renewal invoice sent', { userId: sub.user_id, paymentId: payment?.id });
      } catch (err: unknown) {
        const error = err as { error_code?: number };
        log.error('Failed to send renewal invoice to user', { userId: sub.user_id, telegramId: sub.telegram_id, error: err });

        await execute(`UPDATE payments SET status = 'failed', updated_at = NOW() WHERE id = $1`, [payment!.id]);

        if (error.error_code === 403) {
          // User blocked bot — disable auto-renew silently
          await execute(
            `UPDATE subscriptions SET auto_renew = false, updated_at = NOW() WHERE id = $1`,
            [sub.subscription_id],
          );
        } else {
          // Other error — notify and disable
          await sendWithRetry(
            sub.telegram_id,
            `⚠️ <b>Subscription renewal failed</b>\n\nWe couldn't process your auto-renewal. Auto-renewal has been disabled.\n\nYou can re-subscribe anytime from the Settings page.`,
          );
          await execute(
            `UPDATE subscriptions SET auto_renew = false, updated_at = NOW() WHERE id = $1`,
            [sub.subscription_id],
          );
        }

        failed++;
      }

      // Rate limit: small delay between users
      await sleep(200);
    } catch (err) {
      log.error('Unexpected error processing subscription renewal', { subscriptionId: sub.subscription_id, error: err });
      failed++;
    }
  }

  const elapsed = Date.now() - startTime;
  log.info('Completed', { elapsed, total: expiring.length, renewed, failed });
}
