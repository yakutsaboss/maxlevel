import { Router, Request, Response } from 'express';
import { authenticateTelegram, authorizeUser } from '../middleware/auth.js';
import { mutationLimiter, readLimiter } from '../middleware/rateLimiter.js';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached, invalidate } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  validateRequired,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import { safeParseInt } from '../../utils/validation.js';

/** Row shape returned by friend_requests table queries (RETURNING *). */
interface FriendRequestRow {
  [key: string]: unknown;
  id: number;
  from_user_id: number;
  to_user_id: number;
  status: string;
  created_at: string;
}

const router = Router();

// POST /api/social/friends/request — send friend request
router.post('/friends/request', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { fromUserId, toUserId } = req.body;
  validateRequired(req.body, ['fromUserId', 'toUserId']);

  // Input validation
  if (!Number.isInteger(fromUserId) || fromUserId <= 0) {
    throw new BadRequestError('fromUserId must be a positive integer');
  }
  if (!Number.isInteger(toUserId) || toUserId <= 0) {
    throw new BadRequestError('toUserId must be a positive integer');
  }
  if (fromUserId === toUserId) {
    throw new BadRequestError('Cannot send friend request to yourself');
  }

  const existing = await queryOne(
    `SELECT id, status FROM friend_requests
     WHERE (from_user_id = $1 AND to_user_id = $2)
        OR (from_user_id = $2 AND to_user_id = $1)`,
    [fromUserId, toUserId]
  );

  if (existing) {
    throw new BadRequestError('Friend request already exists');
  }

  const request = await queryOne(
    `INSERT INTO friend_requests (from_user_id, to_user_id)
     VALUES ($1, $2) RETURNING *`,
    [fromUserId, toUserId]
  );

  res.status(201).json(successResponse(request, 'Friend request sent'));
}));

// POST /api/social/friends/accept — accept friend request
router.post('/friends/accept', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.body;
  validateRequired(req.body, ['requestId']);

  // Input validation
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new BadRequestError('requestId must be a positive integer');
  }

  const request = await queryOne<FriendRequestRow>(
    `UPDATE friend_requests SET status = 'accepted'
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [requestId]
  );

  if (!request) {
    throw new NotFoundError('Friend request not found or already processed');
  }

  invalidate(`social:challenges:${request.from_user_id}`);
  invalidate(`social:challenges:${request.to_user_id}`);

  res.json(successResponse(request, 'Friend request accepted'));
}));

// GET /api/social/friends/:userId — list friends
router.get('/friends/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const friends = await query(
    `SELECT u.id, u.username, u.first_name, u.current_level, u.total_xp, u.is_active,
            fr.status, fr.created_at AS friends_since
     FROM friend_requests fr
     JOIN users u ON (
       CASE WHEN fr.from_user_id = $1 THEN fr.to_user_id ELSE fr.from_user_id END = u.id
     )
     WHERE (fr.from_user_id = $1 OR fr.to_user_id = $1)
       AND fr.status = 'accepted'
     ORDER BY u.first_name`,
    [userId]
  );

  res.json(successResponse(friends));
}));

// POST /api/social/challenges/create — create challenge
router.post('/challenges/create', authenticateTelegram, mutationLimiter, asyncHandler(async (req: Request, res: Response) => {
  const { creatorId, title, description, mode, targetValue, endDate } = req.body;
  validateRequired(req.body, ['creatorId', 'title']);

  // Input validation
  if (typeof title !== 'string' || title.length === 0 || title.length > 200) {
    throw new BadRequestError('title must be a string with max 200 characters');
  }
  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 2000)) {
    throw new BadRequestError('description must be a string with max 2000 characters');
  }
  if (targetValue !== undefined && targetValue !== null && (!Number.isInteger(targetValue) || targetValue <= 0)) {
    throw new BadRequestError('target_value must be a positive integer');
  }

  const challenge = await queryOne<{ id: number }>(
    `INSERT INTO challenges (creator_id, title, description, mode, target_value, end_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [creatorId, title, description || null, mode || null, targetValue || null, endDate || null]
  );

  // Auto-join creator as first participant
  await execute(
    `INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2)`,
    [challenge!.id, creatorId]
  );

  invalidate(`social:challenges:${creatorId}`);

  res.status(201).json(successResponse(challenge, 'Challenge created'));
}));

// GET /api/social/challenges/:userId — list user's challenges
router.get('/challenges/:userId', authenticateTelegram, authorizeUser, readLimiter, asyncHandler(async (req: Request, res: Response) => {
  const userId = safeParseInt(req.params.userId, 0);

  const challenges = await cached(`social:challenges:${userId}`, 2 * 60_000, () =>
    query(
      `SELECT c.*, cp.progress, cp.joined_at,
              (SELECT COUNT(*) FROM challenge_participants WHERE challenge_id = c.id) AS participant_count
       FROM challenges c
       JOIN challenge_participants cp ON cp.challenge_id = c.id AND cp.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    )
  );

  res.json(successResponse(challenges));
}));

export const socialRouter = router;
