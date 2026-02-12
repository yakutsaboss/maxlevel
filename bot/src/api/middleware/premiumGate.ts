/**
 * Premium Gate Middleware
 * Checks user subscription tier before allowing access to premium endpoints.
 * Tier hierarchy: free < pro < premium
 */

import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../../utils/db.js';
import { logger } from '../../utils/logger.js';

const log = logger.child({ component: 'premiumGate' });

/** Tier hierarchy — higher number = higher tier */
const TIER_LEVELS: Record<string, number> = {
  free: 0,
  pro: 1,
  premium: 2,
};

/**
 * Middleware factory that requires a minimum subscription tier.
 *
 * Usage:
 *   router.get('/premium-feature', requirePremium('pro'), handler);
 */
export function requirePremium(minTier: string) {
  const requiredLevel = TIER_LEVELS[minTier] ?? 0;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const userId = req.params.userId
      ? parseInt(req.params.userId)
      : (req.body?.userId ? parseInt(req.body.userId) : null);

    if (!userId || isNaN(userId)) {
      res.status(400).json({
        success: false,
        error: 'Bad Request',
        message: 'userId is required for premium access check',
      });
      return;
    }

    try {
      const sub = await queryOne<{ tier: string; expires_at: string | null }>(
        `SELECT tier, expires_at FROM subscriptions WHERE user_id = $1`,
        [userId],
      );

      const userTier = sub?.tier ?? 'free';
      const userLevel = TIER_LEVELS[userTier] ?? 0;

      // Check expiry — treat expired subscriptions as free
      if (sub?.expires_at && new Date(sub.expires_at) < new Date()) {
        log.info('Subscription expired, treating as free', { userId, tier: userTier, expires_at: sub.expires_at });
        if (requiredLevel > TIER_LEVELS['free']) {
          res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: `This feature requires ${minTier} tier or higher. Your subscription has expired.`,
          });
          return;
        }
        next();
        return;
      }

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
