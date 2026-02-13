/**
 * Premium Gate Middleware
 * Checks user subscription tier before allowing access to premium endpoints.
 * Tier hierarchy: free < subscriber < premium
 *
 * - free: default (2 modes)
 * - subscriber: subscribed to @yakutsaway channel (3 modes)
 * - premium: Telegram Stars payment (6 modes)
 */

import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';
import { safeParseInt } from '../../utils/validation.js';

const log = logger.child({ component: 'premiumGate' });

/** Tier hierarchy — higher number = higher tier */
export const TIER_LEVELS: Record<string, number> = {
  free: 0,
  subscriber: 1,
  premium: 2,
};

/** Maximum number of active modes per tier */
export const MODE_LIMITS: Record<string, number> = {
  free: 2,
  subscriber: 3,
  premium: 6,
};

/**
 * Determine the user's effective tier by checking:
 * 1. subscriptions table (for premium — Stars-based)
 * 2. channel_subscriptions cache (for subscriber — channel-based)
 * Falls back to 'free' if no subscription or channel membership found.
 */
export async function getUserEffectiveTier(userId: number): Promise<string> {
  // Check subscriptions table first (premium takes priority)
  const sub = await queryOne<{ tier: string; expires_at: string | null }>(
    `SELECT tier, expires_at FROM subscriptions WHERE user_id = $1`,
    [userId],
  );

  if (sub) {
    // Expired premium subscription → fall through to channel check
    if (sub.expires_at && new Date(sub.expires_at) < new Date()) {
      log.info('Subscription expired, checking channel', { userId, tier: sub.tier, expires_at: sub.expires_at });
    } else if (sub.tier === 'premium') {
      return 'premium';
    }
  }

  // Check channel_subscriptions cache for subscriber tier
  const channelSub = await queryOne<{ is_subscribed: boolean; checked_at: string }>(
    `SELECT is_subscribed, checked_at FROM channel_subscriptions WHERE user_id = $1`,
    [userId],
  );

  if (channelSub?.is_subscribed) {
    return 'subscriber';
  }

  // If subscriptions row says 'subscriber' but channel cache says no → trust channel cache
  // If no data at all → free
  return 'free';
}

/**
 * Middleware factory that requires a minimum subscription tier.
 *
 * Usage:
 *   router.get('/premium-feature', requirePremium('subscriber'), handler);
 */
export function requirePremium(minTier: string) {
  const requiredLevel = TIER_LEVELS[minTier] ?? 0;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.userId
      ? safeParseInt(req.params.userId, 0)
      : (req.body?.userId ? safeParseInt(String(req.body.userId), 0) : null);

    if (!userId || userId === 0) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId is required for premium access check',
      });
      return;
    }

    try {
      const userTier = await getUserEffectiveTier(userId);
      const userLevel = TIER_LEVELS[userTier] ?? 0;

      if (userLevel < requiredLevel) {
        log.info('Premium gate denied', { userId, userTier, requiredTier: minTier });
        res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `This feature requires ${minTier} tier or higher. Current tier: ${userTier}`,
        });
        return;
      }

      next();
    } catch (err) {
      log.error('Premium gate check failed', err);
      next(err);
    }
  };
}
