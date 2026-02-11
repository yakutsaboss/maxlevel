/**
 * Shared utilities for quest sub-routes.
 * Used by quest-completion.ts, quest-progress.ts, and quest-assignment.ts.
 */
export { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
export { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
export { query, queryOne, execute, transaction } from '../../utils/db.js';
export { invalidateUserCache } from '../../utils/cache.js';
export { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';
export { updateStreak } from '../../utils/streak.js';
export { QUEST_STATUS, QUEST_FREQUENCY } from '../utils/constants.js';
export {
  asyncHandler,
  successResponse,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

export { logger } from '../../utils/logger.js';
