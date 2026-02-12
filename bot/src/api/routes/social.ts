import { Router, Request, Response } from 'express';
import { query, queryOne, execute } from '../../utils/db.js';
import { cached } from '../../utils/cache.js';
import {
  asyncHandler,
  successResponse,
  validateRequired,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';

const router = Router();

// POST /api/social/friends/request — send friend request
router.post('/friends/request', asyncHandler(async (req: Request, res: Response) => {
  const { fromUserId, toUserId } = req.body;
  validateRequired(req.body, ['fromUserId', 'toUserId']);

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
router.post('/friends/accept', asyncHandler(async (req: Request, res: Response) => {
  const { requestId } = req.body;
  validateRequired(req.body, ['requestId']);

  const request = await queryOne(
    `UPDATE friend_requests SET status = 'accepted'
     WHERE id = $1 AND status = 'pending' RETURNING *`,
    [requestId]
  );

  if (!request) {
    throw new NotFoundError('Friend request not found or already processed');
  }

  res.json(successResponse(request, 'Friend request accepted'));
}));

// GET /api/social/friends/:userId — list friends
router.get('/friends/:userId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

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
router.post('/challenges/create', asyncHandler(async (req: Request, res: Response) => {
  const { creatorId, title, description, mode, targetValue, endDate } = req.body;
  validateRequired(req.body, ['creatorId', 'title']);

  const challenge = await queryOne(
    `INSERT INTO challenges (creator_id, title, description, mode, target_value, end_date)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [creatorId, title, description || null, mode || null, targetValue || null, endDate || null]
  );

  // Auto-join creator as first participant
  await execute(
    `INSERT INTO challenge_participants (challenge_id, user_id) VALUES ($1, $2)`,
    [(challenge as any).id, creatorId]
  );

  res.status(201).json(successResponse(challenge, 'Challenge created'));
}));

// GET /api/social/challenges/:userId — list user's challenges
router.get('/challenges/:userId', asyncHandler(async (req: Request, res: Response) => {
  const userId = parseInt(req.params.userId);

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
