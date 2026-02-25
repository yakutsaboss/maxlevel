/**
 * Payment Grammy Handlers
 * Handles Telegram Stars payment flow: pre-checkout verification and successful payment processing.
 * Supports tier upgrades and mode unlocks (Run 91).
 * Sends payment notifications to owner via notification bot.
 */

import type { MyContext } from '../bot.js';
import { queryOne, transaction } from '../utils/db.js';
import { logger } from '../utils/logger.js';
import { TIER_PRICES, type Tier } from '../utils/paymentHelpers.js';
import { DEFAULT_CELEBRATION_STICKERS } from '../utils/stickerConfig.js';

const log = logger.child({ component: 'payment-handlers' });

interface TierPayload {
  payment_id: number;
  tier: Tier;
  type?: undefined;
}

interface ModeUnlockPayload {
  payment_id: number;
  type: 'mode_unlock';
  mode_name: string;
}

interface ShopItemPayload {
  payment_id: number;
  type: 'shop_item';
  shop_item_id: number;
  user_id: number;
}

interface ContentPurchasePayload {
  payment_id: number;
  type: 'content_purchase';
  content_id: number;
}

type PaymentPayload = TierPayload | ModeUnlockPayload | ShopItemPayload | ContentPurchasePayload;

function parsePayload(raw: string): PaymentPayload | null {
  try {
    const data = JSON.parse(raw);
    if (typeof data.payment_id !== 'number') return null;
    // Mode unlock payload
    if (data.type === 'mode_unlock' && typeof data.mode_name === 'string') {
      return data as ModeUnlockPayload;
    }
    // Shop item payload
    if (data.type === 'shop_item' && typeof data.shop_item_id === 'number') {
      return data as ShopItemPayload;
    }
    // Content purchase payload (Run 95)
    if (data.type === 'content_purchase' && typeof data.content_id === 'number') {
      return data as ContentPurchasePayload;
    }
    // Tier upgrade payload
    if (data.tier) {
      return data as TierPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Send payment notification to the owner via notification bot.
 * Uses direct Telegram HTTP API — fire-and-forget, never blocks the payment flow.
 */
async function notifyOwnerPayment(details: {
  userName: string;
  telegramId: number;
  amount: number;
  type: string;
  label: string;
  chargeId: string;
}): Promise<void> {
  const notifToken = process.env.TELEGRAM_NOTIFICATION_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_NOTIFICATION_CHAT_ID;
  if (!notifToken || !chatId) {
    log.warn('Notification bot not configured — skipping payment notification');
    return;
  }

  const msg =
    `💰 <b>New Payment Received!</b>\n\n` +
    `👤 User: ${details.userName} (ID: ${details.telegramId})\n` +
    `⭐ Amount: ${details.amount} Stars\n` +
    `📦 Type: ${details.type}\n` +
    `🏷 Item: ${details.label}\n` +
    `🔑 Charge: <code>${details.chargeId}</code>`;

  try {
    const url = `https://api.telegram.org/bot${notifToken}/sendMessage`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML' }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      log.warn('Failed to send payment notification', { status: resp.status, body });
    }
  } catch (err) {
    log.warn('Error sending payment notification', { error: err });
  }
}

/**
 * Send a celebration sticker after a successful payment.
 * Wrapped in try/catch so sticker failure never blocks payment flow.
 */
async function sendCelebrationSticker(ctx: MyContext): Promise<void> {
  const fileId = DEFAULT_CELEBRATION_STICKERS.payment;
  if (!fileId) return; // No default sticker configured yet

  try {
    await ctx.replyWithSticker(fileId);
  } catch (err) {
    log.warn('Failed to send celebration sticker', { error: err });
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

  // Shop item-specific validation
  if (payload.type === 'shop_item') {
    const shopPayload = payload as ShopItemPayload;
    const shopItem = await queryOne<{ id: number; is_active: boolean; price_stars: number; type: string }>(
      `SELECT id, is_active, price_stars, type FROM shop_items WHERE id = $1`,
      [shopPayload.shop_item_id],
    );

    if (!shopItem) {
      log.warn('Pre-checkout: shop item not found', { shopItemId: shopPayload.shop_item_id });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Item no longer available.' });
      return;
    }

    if (!shopItem.is_active) {
      log.warn('Pre-checkout: shop item inactive', { shopItemId: shopPayload.shop_item_id });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'This item is no longer for sale.' });
      return;
    }

    if (total_amount !== shopItem.price_stars) {
      log.warn('Pre-checkout: shop item price mismatch', {
        shopItemId: shopPayload.shop_item_id,
        expected: shopItem.price_stars,
        received: total_amount,
      });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Price has changed. Please start a new purchase.' });
      return;
    }

    // For one-time items (achievements), check duplicate
    if (shopItem.type === 'achievement') {
      const existingPurchase = await queryOne<{ id: number }>(
        `SELECT id FROM user_purchases WHERE user_id = $1 AND shop_item_id = $2`,
        [shopPayload.user_id, shopPayload.shop_item_id],
      );
      if (existingPurchase) {
        log.warn('Pre-checkout: duplicate achievement purchase', {
          userId: shopPayload.user_id,
          shopItemId: shopPayload.shop_item_id,
        });
        await ctx.answerPreCheckoutQuery(false, { error_message: 'You already own this item.' });
        return;
      }
    }
  }

  // Content purchase validation (Run 95)
  if (payload.type === 'content_purchase') {
    const contentPayload = payload as ContentPurchasePayload;
    const content = await queryOne<{ id: number; is_active: boolean; price_stars: number }>(
      `SELECT id, is_active, price_stars FROM paid_content WHERE id = $1`,
      [contentPayload.content_id],
    );

    if (!content) {
      log.warn('Pre-checkout: content not found', { contentId: contentPayload.content_id });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Content no longer available.' });
      return;
    }

    if (!content.is_active) {
      log.warn('Pre-checkout: content inactive', { contentId: contentPayload.content_id });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'This content is no longer available.' });
      return;
    }

    if (total_amount !== content.price_stars) {
      log.warn('Pre-checkout: content price mismatch', {
        contentId: contentPayload.content_id,
        expected: content.price_stars,
        received: total_amount,
      });
      await ctx.answerPreCheckoutQuery(false, { error_message: 'Price has changed. Please start a new purchase.' });
      return;
    }
  }

  // All checks passed — approve the payment
  log.info('Pre-checkout approved', { paymentId: payment.id });
  await ctx.answerPreCheckoutQuery(true);
}

/**
 * successful_payment handler (on 'message:successful_payment')
 * Telegram sends this after the user has paid.
 * Handles both tier upgrades and mode unlocks.
 * Sends notification to owner via notification bot.
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
  const payment = await queryOne<{
    id: number;
    user_id: number;
    amount: string;
    status: string;
    metadata: { tier?: string; type?: string; mode_name?: string; shop_item_id?: number };
  }>(
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
    await ctx.reply('This payment has already been processed. Enjoy your purchase!');
    return;
  }

  const userName = ctx.from?.first_name || ctx.from?.username || 'Unknown';
  const telegramId = ctx.from?.id || 0;

  // Determine payment type from payload or metadata
  const isShopItem = payload.type === 'shop_item' || payment.metadata?.type === 'shop_item';
  const isModeUnlock = payload.type === 'mode_unlock' || payment.metadata?.type === 'mode_unlock';
  const isContentPurchase = payload.type === 'content_purchase' || payment.metadata?.type === 'content_purchase';

  if (isShopItem) {
    // Shop item purchase flow
    const shopPayload = payload as ShopItemPayload;
    const shopItemId = shopPayload.shop_item_id || (payment.metadata as any)?.shop_item_id;

    if (!shopItemId) {
      log.error('Shop item payment missing shop_item_id', { paymentId: payment.id });
      await ctx.reply('Payment received but item data is missing. Please contact support.');
      return;
    }

    // Look up the shop item
    const shopItem = await queryOne<{ id: number; name: string; type: string; reference_id: number | null }>(
      `SELECT id, name, type, reference_id FROM shop_items WHERE id = $1`,
      [shopItemId],
    );

    if (!shopItem) {
      log.error('Shop item not found after payment', { paymentId: payment.id, shopItemId });
      await ctx.reply('Payment received but the item was not found. Please contact support.');
      return;
    }

    await transaction(async (client) => {
      // Mark payment as completed
      await client.query(
        `UPDATE payments
         SET status = 'completed',
             telegram_payment_charge_id = $1,
             provider_payment_charge_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [telegram_payment_charge_id, provider_payment_charge_id || null, payment.id],
      );

      // Record purchase in user_purchases
      await client.query(
        `INSERT INTO user_purchases (user_id, shop_item_id, payment_method, amount_paid)
         VALUES ($1, $2, 'stars', $3)
         ON CONFLICT DO NOTHING`,
        [payment.user_id, shopItemId, Math.round(parseFloat(payment.amount))],
      );

      // If it's an achievement, unlock it
      if (shopItem.type === 'achievement' && shopItem.reference_id) {
        await client.query(
          `INSERT INTO user_achievements (user_id, achievement_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id, achievement_id) DO NOTHING`,
          [payment.user_id, shopItem.reference_id],
        );
      }
    });

    log.info('Shop item purchase completed', {
      paymentId: payment.id,
      userId: payment.user_id,
      shopItemId,
      itemName: shopItem.name,
      telegramChargeId: telegram_payment_charge_id,
    });

    await ctx.reply(
      `🎉 *Purchase Successful!*\n\n` +
      `You've purchased *${shopItem.name}*!\n\n` +
      `⭐ Amount: ${total_amount} Stars\n\n` +
      `Open /app to see your new item!`,
      { parse_mode: 'Markdown' },
    );

    // Notify owner (fire-and-forget)
    notifyOwnerPayment({
      userName,
      telegramId,
      amount: total_amount,
      type: 'Shop Purchase',
      label: shopItem.name,
      chargeId: telegram_payment_charge_id,
    }).catch(() => {});

  } else if (isContentPurchase) {
    // Content purchase flow (Run 95)
    const contentPayload = payload as ContentPurchasePayload;
    const contentId = contentPayload.content_id || (payment.metadata as any)?.content_id;

    if (!contentId) {
      log.error('Content purchase payment missing content_id', { paymentId: payment.id });
      await ctx.reply('Payment received but content data is missing. Please contact support.');
      return;
    }

    // Look up the content item
    const content = await queryOne<{ id: number; title: string; content_type: string }>(
      `SELECT id, title, content_type FROM paid_content WHERE id = $1`,
      [contentId],
    );

    if (!content) {
      log.error('Content not found after payment', { paymentId: payment.id, contentId });
      await ctx.reply('Payment received but the content was not found. Please contact support.');
      return;
    }

    await transaction(async (client) => {
      // Mark payment as completed
      await client.query(
        `UPDATE payments
         SET status = 'completed',
             telegram_payment_charge_id = $1,
             provider_payment_charge_id = $2,
             updated_at = NOW()
         WHERE id = $3`,
        [telegram_payment_charge_id, provider_payment_charge_id || null, payment.id],
      );

      // Grant content access (ON CONFLICT for idempotency)
      await client.query(
        `INSERT INTO user_content_access (user_id, content_id, payment_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, content_id) DO NOTHING`,
        [payment.user_id, contentId, payment.id],
      );
    });

    log.info('Content purchase completed', {
      paymentId: payment.id,
      userId: payment.user_id,
      contentId,
      contentTitle: content.title,
      telegramChargeId: telegram_payment_charge_id,
    });

    await ctx.reply(
      `🎉 *Purchase Successful!*\n\n` +
      `You now have access to *${content.title}*!\n\n` +
      `⭐ Amount: ${total_amount} Stars\n\n` +
      `Open /app → Premium Content to read it!`,
      { parse_mode: 'Markdown' },
    );

    // Notify owner (fire-and-forget)
    notifyOwnerPayment({
      userName,
      telegramId,
      amount: total_amount,
      type: 'Content Purchase',
      label: content.title,
      chargeId: telegram_payment_charge_id,
    }).catch(() => {});

  } else if (isModeUnlock) {
    const modeName = (payload as ModeUnlockPayload).mode_name || payment.metadata?.mode_name;
    if (!modeName) {
      log.error('Mode unlock payment missing mode_name', { paymentId: payment.id });
      await ctx.reply('Payment received but mode data is missing. Please contact support.');
      return;
    }

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
        `INSERT INTO mode_unlocks (user_id, mode_name, unlock_method, amount_paid)
         VALUES ($1, $2, 'stars', $3)
         ON CONFLICT (user_id, mode_name) DO NOTHING`,
        [payment.user_id, modeName, Math.round(parseFloat(payment.amount))],
      );
    });

    log.info('Mode unlock completed', {
      paymentId: payment.id,
      userId: payment.user_id,
      modeName,
      telegramChargeId: telegram_payment_charge_id,
    });

    const modeLabel = modeName.charAt(0).toUpperCase() + modeName.slice(1);

    await ctx.reply(
      `🎉 *Mode Unlocked!*\n\n` +
      `You've unlocked *${modeLabel}* mode!\n\n` +
      `⭐ Amount: ${total_amount} Stars\n` +
      `🔓 ${modeLabel} features are now available\n\n` +
      `Open /app to start using it!`,
      { parse_mode: 'Markdown' },
    );

    // Send celebration sticker (fire-and-forget)
    sendCelebrationSticker(ctx).catch(() => {});

    // Notify owner (fire-and-forget)
    notifyOwnerPayment({
      userName,
      telegramId,
      amount: total_amount,
      type: 'Mode Unlock',
      label: `${modeLabel} Mode`,
      chargeId: telegram_payment_charge_id,
    }).catch(() => {});

  } else {
    // Tier upgrade flow
    const tier = (payload as TierPayload).tier || (payment.metadata?.tier as string) || 'premium';

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

    // Send celebration sticker (fire-and-forget)
    sendCelebrationSticker(ctx).catch(() => {});

    // Notify owner (fire-and-forget)
    notifyOwnerPayment({
      userName,
      telegramId,
      amount: total_amount,
      type: 'Tier Upgrade',
      label: `${tierLabel} (30 days)`,
      chargeId: telegram_payment_charge_id,
    }).catch(() => {});
  }
}
