/**
 * Channel Subscription API Routes
 * Checks @yakutsaway Telegram channel membership and manages the
 * `subscriber` tier — auto-upgrades on join, auto-downgrades on leave.
 * Uses a 1-hour cache (channel_subscriptions table) to avoid hammering the API.
 */

import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../../utils/db.js';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter, mutationLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler, successResponse, BadRequestError, NotFoundError } from '../utils/errors.js';
import { logger } from '../../utils/logger.js';
import { safeParseInt } from '../../utils/validation.js';
import { checkChannelMembership } from '../../utils/telegramApi.js';

const router = Router();
const log = logger.child({ component: 'channel' });

/** Cache TTL: 1 hour in milliseconds */
const CACHE_TTL_MS = 60 * 60 * 1000;

const CHANNEL_USERNAME = 'yakutsaway';

interface ChannelCacheRow {
  [key: string]: unknown;
  user_id: number;
  telegram_id: string;
  is_subscribed: boolean;
  checked_at: string;
}

interface UserRow {
  [key: string]: unknown;
  id: number;
  telegram_id: string;
}

interface SubscriptionRow {
  [key: string]: unknown;
  tier: string;
  expires_at: string | null;
}

/**
 * Check whether the cached channel status is still fresh (< 1 hour old).
 */
function isCacheFresh(checkedAt: string): boolean {
  const checkedTime = new Date(checkedAt).getTime();
  return Date.now() - checkedTime < CACHE_TTL_MS;
}

/**
 * Auto-upgrade user to subscriber if they are a channel member and currently free,
 * or auto-downgrade to free if they left the channel and are on subscriber tier.
 * Does NOT touch premium tier (that's Stars-based).
 */
async function syncTierWithChannelStatus(userId: number, isMember: boolean): Promise<string> {
  const sub = await queryOne<SubscriptionRow>(
    `SELECT tier, expires_at FROM subscriptions WHERE user_id = $1`,
    [userId],
  );

  const currentTier = sub?.tier ?? 'free';

  if (isMember && currentTier === 'free') {
    // Upgrade to subscriber
    await execute(
      `INSERT INTO subscriptions (user_id, tier, started_at, auto_renew)
       VALUES ($1, 'subscriber', NOW(), false)
       ON CONFLICT (user_id) DO UPDATE
       SET tier = 'subscriber', started_at = NOW(), updated_at = NOW()`,
      [userId],
    );
    log.info('Auto-upgraded to subscriber', { userId });
    return 'subscriber';
  }

  if (!isMember && currentTier === 'subscriber') {
    // Downgrade to free
    await execute(
      `UPDATE subscriptions SET tier = 'free', updated_at = NOW() WHERE user_id = $1`,
      [userId],
    );
    log.info('Auto-downgraded to free', { userId });
    return 'free';
  }

  // No change needed (premium users are not affected by channel status)
  return currentTier;
}

/**
 * Perform a fresh Telegram API check, update cache, and sync tier.
 * Shared between GET (cache miss) and POST (force refresh).
 */
async function performFreshCheck(userId: number, telegramId: string): Promise<{
  is_subscribed: boolean;
  tier: string;
  checked_at: string;
}> {
  const result = await checkChannelMembership(Number(telegramId), CHANNEL_USERNAME);

  // Upsert cache
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO channel_subscriptions (user_id, telegram_id, channel_username, is_subscribed, checked_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, channel_username) DO UPDATE
     SET is_subscribed = $4, checked_at = NOW()`,
    [userId, telegramId, CHANNEL_USERNAME, result.isMember],
  );

  // Sync tier
  const tier = await syncTierWithChannelStatus(userId, result.isMember);

  return {
    is_subscribed: result.isMember,
    tier,
    checked_at: now,
  };
}

// ─── GET /:userId/status ────────────────────────────────────────────────────
// Check channel subscription status with 1-hour cache
router.get('/:userId/status', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) {
    throw new BadRequestError('Invalid userId');
  }

  // Get user's telegram_id
  const user = await queryOne<UserRow>(
    `SELECT id, telegram_id FROM users WHERE id = $1`,
    [userId],
  );
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  // Check cache
  const cached = await queryOne<ChannelCacheRow>(
    `SELECT user_id, telegram_id, is_subscribed, checked_at
     FROM channel_subscriptions
     WHERE user_id = $1 AND channel_username = $2`,
    [userId, CHANNEL_USERNAME],
  );

  if (cached && isCacheFresh(cached.checked_at)) {
    // Cache hit — return cached status but still report effective tier
    const sub = await queryOne<SubscriptionRow>(
      `SELECT tier, expires_at FROM subscriptions WHERE user_id = $1`,
      [userId],
    );
    const tier = sub?.tier ?? 'free';

    res.json(successResponse({
      channel: CHANNEL_USERNAME,
      is_subscribed: cached.is_subscribed,
      tier,
      checked_at: cached.checked_at,
      from_cache: true,
    }));
    return;
  }

  // Cache miss or stale — fresh check
  const result = await performFreshCheck(userId, user.telegram_id);

  res.json(successResponse({
    channel: CHANNEL_USERNAME,
    is_subscribed: result.is_subscribed,
    tier: result.tier,
    checked_at: result.checked_at,
    from_cache: false,
  }));
}));

// ─── POST /:userId/refresh ──────────────────────────────────────────────────
// Force re-check channel status, bypassing cache
router.post('/:userId/refresh', authenticateTelegram, authorizeUser, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, NaN);
  if (isNaN(userId)) {
    throw new BadRequestError('Invalid userId');
  }

  const user = await queryOne<UserRow>(
    `SELECT id, telegram_id FROM users WHERE id = $1`,
    [userId],
  );
  if (!user) {
    throw new NotFoundError(`User ${userId} not found`);
  }

  const result = await performFreshCheck(userId, user.telegram_id);

  log.info('Channel status force-refreshed', { userId, is_subscribed: result.is_subscribed, tier: result.tier });

  res.json(successResponse({
    channel: CHANNEL_USERNAME,
    is_subscribed: result.is_subscribed,
    tier: result.tier,
    checked_at: result.checked_at,
    from_cache: false,
  }));
}));

export { router as channelRouter };
