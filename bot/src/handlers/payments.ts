/**
 * Payment Grammy Handlers
 * Handles Telegram Stars payment flow: pre-checkout verification and successful payment processing.
 */

import type { MyContext } from '../bot.js';
import { queryOne, transaction } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { TIER_PRICES, type Tier } from '../utils/paymentHelpers.js';

const log = logger.child({ component: 'payment-handlers' });

interface PaymentPayload {
  payment_id: number;
  tier: Tier;
}

function parsePayload(raw: string): PaymentPayload | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data.payment_id === 'number' && data.tier) {
      return data as PaymentPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * pre_checkout_query handler
 * Telegram sends this before charging the user. We must respond within 10 seconds.
 * Verify the payment_id exists, is pending, and the amount matches.
 */
export async function handlePreCheckoutQuery(ctx: MyContext) {
  const query = ctx.preCheckoutQuery!;
  const { invoice_payload, total_amount, currency } = query;

  log.info('Pre-checkout query received', {
    preCheckoutQueryId: query.id,
    totalAmount: total_amount,
    currency,
    payload: invoice_payload,
  });

  // Parse payload
  const payload = parsePayload(invoice_payload);
  if (!payload) {
    log.warn('Pre-checkout: invalid payload', { invoice_payload });
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Invalid payment data. Please try again.' });
    return;
  }

  // Verify payment record exists and is pending
  const payment = await queryOne<{ id: number; amount: string; status: string; metadata: { tier?: string } }>(
    `SELECT id, amount, status, metadata FROM payments WHERE id = $1`,
    [payload.payment_id],
  );

  if (!payment) {
    log.warn('Pre-checkout: payment not found', { paymentId: payload.payment_id });
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Payment not found. Please start a new payment.' });
    return;
  }

  if (payment.status !== 'pending') {
    log.warn('Pre-checkout: payment not pending', { paymentId: payment.id, status: payment.status });
    await ctx.answerPreCheckoutQuery(false, { error_message: 'This payment has already been processed.' });
    return;
  }

  // Verify amount matches
  const expectedAmount = Math.round(parseFloat(payment.amount));
  if (total_amount !== expectedAmount) {
    log.warn('Pre-checkout: amount mismatch', {
      paymentId: payment.id,
      expected: expectedAmount,
      received: total_amount,
    });
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Payment amount mismatch. Please start a new payment.' });
    return;
  }

  // Verify currency is XTR (Telegram Stars)
  if (currency !== 'XTR') {
    log.warn('Pre-checkout: wrong currency', { paymentId: payment.id, currency });
    await ctx.answerPreCheckoutQuery(false, { error_message: 'Invalid currency. Only Telegram Stars (XTR) accepted.' });
    return;
  }

  // All checks passed — approve the payment
  log.info('Pre-checkout approved', { paymentId: payment.id });
  await ctx.answerPreCheckoutQuery(true);
}

/**
 * successful_payment handler (on 'message:successful_payment')
 * Telegram sends this after the user has paid. Update DB and activate subscription.
 */
export async function handleSuccessfulPayment(ctx: MyContext) {
  const sp = ctx.message!.successful_payment!;
  const {
    telegram_payment_charge_id,
    provider_payment_charge_id,
    invoice_payload,
    total_amount,
    currency,
  } = sp;

  log.info('Successful payment received', {
    telegramChargeId: telegram_payment_charge_id,
    providerChargeId: provider_payment_charge_id,
    totalAmount: total_amount,
    currency,
    payload: invoice_payload,
  });

  const payload = parsePayload(invoice_payload);
  if (!payload) {
    log.error('Successful payment: invalid payload — cannot process', { invoice_payload });
    await ctx.reply('Payment received but we could not process it. Please contact support.');
    return;
  }

  // Look up the pending payment
  const payment = await queryOne<{ id: number; user_id: number; amount: string; status: string; metadata: { tier?: string } }>(
    `SELECT id, user_id, amount, status, metadata FROM payments WHERE id = $1`,
    [payload.payment_id],
  );

  if (!payment) {
    log.error('Successful payment: payment record not found', { paymentId: payload.payment_id });
    await ctx.reply('Payment received but record not found. Please contact support with your charge ID: ' + telegram_payment_charge_id);
    return;
  }

  // Idempotent: if already completed, just confirm
  if (payment.status === 'completed') {
    log.info('Successful payment: already processed (idempotent)', { paymentId: payment.id });
    await ctx.reply('Your Premium subscription is already active! Enjoy all features.');
    return;
  }

  const tier = payload.tier || (payment.metadata?.tier as string) || 'premium';

  // Complete payment and activate subscription in a single transaction
  await transaction(async (client) => {
    await client.query(
      `UPDATE payments
       SET status = 'completed',
           telegram_payment_charge_id = $1,
           provider_payment_charge_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [telegram_payment_charge_id, provider_payment_charge_id || null, payment.id],
    );

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

  log.info('Payment completed & subscription activated', {
    paymentId: payment.id,
    userId: payment.user_id,
    tier,
    telegramChargeId: telegram_payment_charge_id,
  });

  const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
  const price = TIER_PRICES[tier as Tier] ?? total_amount;

  await ctx.reply(
    `🎉 *Payment Successful!*\n\n` +
    `You've been upgraded to *${tierLabel}* tier!\n\n` +
    `⭐ Amount: ${price} Stars\n` +
    `📅 Valid for: 30 days\n` +
    `🎮 Unlocked: 6 modes, all features\n\n` +
    `Thank you for your support! Use /app to explore your new features.`,
    { parse_mode: 'Markdown' },
  );
}
