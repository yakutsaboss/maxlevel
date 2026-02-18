import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { readLimiter } from '../middleware/rateLimiter.js';
import { queryOne } from '../../utils/db.js';
import { asyncHandler, successResponse, NotFoundError } from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';
import { getRecommendedArticles, getDailyTip } from '../../utils/contentRecommender.js';

const router = Router();

// ── GET /:userId — Recommended articles + daily tip ──────────────────

router.get('/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new NotFoundError('User not found');
  }

  const limit = Math.min(10, Math.max(1, safeParseInt(req.query.limit as string, 5)));

  const [articles, dailyTip] = await Promise.all([
    getRecommendedArticles(userId, limit),
    getDailyTip(userId),
  ]);

  res.json(successResponse({
    articles,
    dailyTip,
  }));
}));

// ── GET /:userId/tip — Just the daily tip ────────────────────────────

router.get('/:userId/tip', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);
  if (userId <= 0) {
    throw new NotFoundError('User not found');
  }

  const tip = await getDailyTip(userId);
  res.json(successResponse(tip));
}));

export { router as recommendationsRouter };
