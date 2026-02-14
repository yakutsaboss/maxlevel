/**
 * HTTP integration tests for social routes (bot/src/api/routes/social.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 61 Agent C: Added tests for 5 new endpoints —
 * GET /friends/pending, POST /friends/reject, DELETE /friends/:userId/:friendId,
 * POST /challenges/:challengeId/join, PATCH /challenges/:challengeId/progress
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { socialRouter } from '../../../api/routes/social.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/social', socialRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/social/friends/request', () => {
  it('should return 201 and create a friend request', async () => {
    db.queryOne.mockResolvedValueOnce(null); // no existing request
    db.queryOne.mockResolvedValueOnce({ id: 1, from_user_id: 1, to_user_id: 2, status: 'pending' }); // INSERT

    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ fromUserId: 1, toUserId: 2 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.from_user_id).toBe(1);
    expect(res.body.data.to_user_id).toBe(2);
    expect(res.body.message).toBe('Friend request sent');
  });

  it('should return 400 when fromUserId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ toUserId: 2 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('fromUserId');
  });

  it('should return 400 when toUserId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ fromUserId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('toUserId');
  });

  it('should return 400 when sending request to yourself', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ fromUserId: 1, toUserId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Cannot send friend request to yourself');
  });

  it('should return 400 when friend request already exists', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 5, status: 'pending' }); // existing found

    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ fromUserId: 1, toUserId: 2 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already exists');
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/social/friends/request')
      .send({ fromUserId: 1, toUserId: 2 })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('POST /api/social/friends/accept', () => {
  it('should return 200 and accept the friend request', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1, from_user_id: 1, to_user_id: 2, status: 'accepted' });

    const res = await request(buildApp())
      .post('/api/social/friends/accept')
      .send({ requestId: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('accepted');
    expect(res.body.message).toBe('Friend request accepted');
  });

  it('should return 400 when requestId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/accept')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('requestId');
  });

  it('should return 404 when request not found or already processed', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/social/friends/accept')
      .send({ requestId: 999 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });
});

describe('GET /api/social/friends/:userId', () => {
  it('should return 200 with friend list', async () => {
    db.query.mockResolvedValueOnce([
      { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500, is_active: true, status: 'accepted', friends_since: '2026-01-15T00:00:00Z' },
      { id: 3, username: 'bob', first_name: 'Bob', current_level: 3, total_xp: 1200, is_active: true, status: 'accepted', friends_since: '2026-01-20T00:00:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/social/friends/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].username).toBe('alice');
    expect(res.body.data[1].username).toBe('bob');
  });

  it('should return 200 with empty array when no friends', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/social/friends/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('POST /api/social/challenges/create', () => {
  it('should return 201 and create a challenge', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 10, creator_id: 1, title: 'Daily Steps', description: 'Walk 10k steps', mode: 'fitness', target_value: 10000 });
    db.execute.mockResolvedValueOnce(undefined); // auto-join participant

    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1, title: 'Daily Steps', description: 'Walk 10k steps', mode: 'fitness', targetValue: 10000 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Daily Steps');
    expect(res.body.message).toBe('Challenge created');
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('challenge_participants'),
      [10, 1]
    );
  });

  it('should return 400 when title is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('title');
  });

  it('should return 400 when title exceeds 200 characters', async () => {
    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1, title: 'A'.repeat(201) })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('max 200 characters');
  });

  it('should return 400 when targetValue is not a positive integer', async () => {
    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1, title: 'Test', targetValue: -5 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('target_value must be a positive integer');
  });
});

describe('GET /api/social/challenges/:userId', () => {
  it('should return 200 with user challenges', async () => {
    db.query.mockResolvedValueOnce([
      { id: 10, title: 'Daily Steps', creator_id: 1, progress: 5000, joined_at: '2026-02-01T00:00:00Z', participant_count: 3 },
    ]);

    const res = await request(buildApp())
      .get('/api/social/challenges/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Daily Steps');
    expect(res.body.data[0].participant_count).toBe(3);
  });

  it('should return 200 with empty array when no challenges', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/social/challenges/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

// ─── Run 61: New endpoint tests (Agent A additions) ──────────────────

describe('GET /api/social/friends/pending/:userId', () => {
  it('should return 200 with pending friend requests', async () => {
    db.query.mockResolvedValueOnce([
      { id: 10, from_user: { id: 3, username: 'charlie', first_name: 'Charlie', current_level: 7 }, created_at: '2026-02-10T12:00:00Z' },
      { id: 11, from_user: { id: 4, username: 'diana', first_name: 'Diana', current_level: 2 }, created_at: '2026-02-11T08:00:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/social/friends/pending/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
  });

  it('should return 200 with empty array when no pending requests', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/social/friends/pending/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 400 for non-numeric userId', async () => {
    const res = await request(buildApp())
      .get('/api/social/friends/pending/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/social/friends/reject', () => {
  it('should return 200 and reject a pending friend request', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 10, from_user_id: 3, to_user_id: 1, status: 'rejected' });

    const res = await request(buildApp())
      .post('/api/social/friends/reject')
      .send({ requestId: 10, userId: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 400 when requestId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/reject')
      .send({ userId: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('requestId');
  });

  it('should return 400 when userId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/friends/reject')
      .send({ requestId: 10 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('userId');
  });

  it('should return 404 when request not found or not pending', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/social/friends/reject')
      .send({ requestId: 999, userId: 1 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });
});

describe('DELETE /api/social/friends/:userId/:friendId', () => {
  it('should return 200 and remove an accepted friendship', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 5, from_user_id: 1, to_user_id: 2, status: 'accepted' });

    const res = await request(buildApp())
      .delete('/api/social/friends/1/2')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 when friendship not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .delete('/api/social/friends/1/999')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('should return 400 for non-numeric userId', async () => {
    const res = await request(buildApp())
      .delete('/api/social/friends/abc/2')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for non-numeric friendId', async () => {
    const res = await request(buildApp())
      .delete('/api/social/friends/1/xyz')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/social/challenges/:challengeId/join', () => {
  it('should return 200 and join an active challenge', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 10, status: 'active' }); // challenge exists + active
    db.queryOne.mockResolvedValueOnce(null); // not already joined
    db.execute.mockResolvedValueOnce(undefined); // INSERT participant

    const res = await request(buildApp())
      .post('/api/social/challenges/10/join')
      .send({ userId: 2 })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(db.execute).toHaveBeenCalledWith(
      expect.stringContaining('challenge_participants'),
      expect.arrayContaining([10, 2]),
    );
  });

  it('should return 400 when userId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/social/challenges/10/join')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('userId');
  });

  it('should return 400 when already joined', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 10, status: 'active' }); // challenge exists
    db.queryOne.mockResolvedValueOnce({ id: 5, user_id: 2 }); // already joined

    const res = await request(buildApp())
      .post('/api/social/challenges/10/join')
      .send({ userId: 2 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Already');
  });

  it('should return 404 when challenge not found', async () => {
    db.queryOne.mockResolvedValueOnce(null); // challenge doesn't exist

    const res = await request(buildApp())
      .post('/api/social/challenges/999/join')
      .send({ userId: 2 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });
});

describe('PATCH /api/social/challenges/:challengeId/progress', () => {
  it('should return 200 and update challenge progress', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 5, challenge_id: 10, user_id: 2, progress: 50 }); // participant found
    db.queryOne.mockResolvedValueOnce({ id: 5, challenge_id: 10, user_id: 2, progress: 75 }); // UPDATE RETURNING

    const res = await request(buildApp())
      .patch('/api/social/challenges/10/progress')
      .send({ userId: 2, progress: 75 })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 400 when userId is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/social/challenges/10/progress')
      .send({ progress: 50 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('userId');
  });

  it('should return 400 when progress is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/social/challenges/10/progress')
      .send({ userId: 2 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('progress');
  });

  it('should return 400 for negative progress', async () => {
    const res = await request(buildApp())
      .patch('/api/social/challenges/10/progress')
      .send({ userId: 2, progress: -5 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 404 when user is not a participant', async () => {
    db.queryOne.mockResolvedValueOnce(null); // not a participant

    const res = await request(buildApp())
      .patch('/api/social/challenges/10/progress')
      .send({ userId: 999, progress: 50 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Not a participant');
  });
});

// ─── Run 62: Challenge Discovery + Details endpoint tests (Agent C) ────

describe('GET /api/social/challenges/discover', () => {
  it('should return 200 with active challenges', async () => {
    db.query.mockResolvedValueOnce([
      {
        id: 1, title: 'Daily Steps', description: 'Walk 10k steps',
        mode: 'fitness', target_value: 10000,
        start_date: '2026-02-01T00:00:00Z', end_date: '2026-02-28T00:00:00Z',
        status: 'active', participant_count: 5,
      },
      {
        id: 2, title: 'Read Books', description: null,
        mode: 'learning', target_value: 5,
        start_date: '2026-02-01T00:00:00Z', end_date: null,
        status: 'active', participant_count: 2,
      },
    ]);

    const res = await request(buildApp())
      .get('/api/social/challenges/discover')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].title).toBe('Daily Steps');
    expect(res.body.data[1].title).toBe('Read Books');
  });

  it('should support mode filter query parameter', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, title: 'Daily Steps', mode: 'fitness', status: 'active', participant_count: 5 },
    ]);

    const res = await request(buildApp())
      .get('/api/social/challenges/discover?mode=fitness')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].mode).toBe('fitness');
  });

  it('should support pagination with limit and offset', async () => {
    db.query.mockResolvedValueOnce([
      { id: 3, title: 'Challenge 3', mode: 'fitness', status: 'active', participant_count: 1 },
    ]);

    const res = await request(buildApp())
      .get('/api/social/challenges/discover?limit=10&offset=5')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
  });

  it('should return empty array when no active challenges', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/social/challenges/discover')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/social/challenges/:challengeId/details', () => {
  it('should return 200 with challenge data and participants', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 10, title: 'Daily Steps', description: 'Walk 10k steps',
      mode: 'fitness', target_value: 10000, status: 'active', creator_id: 1,
    });
    db.query.mockResolvedValueOnce([
      { user_id: 1, username: 'alice', first_name: 'Alice', current_level: 5, progress: 50, joined_at: '2026-02-01T00:00:00Z' },
      { user_id: 2, username: 'bob', first_name: 'Bob', current_level: 3, progress: 20, joined_at: '2026-02-02T00:00:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/social/challenges/10/details')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should return 404 for non-existent challenge', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/social/challenges/999/details')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('should return 400 for non-numeric challengeId', async () => {
    const res = await request(buildApp())
      .get('/api/social/challenges/abc/details')
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/social/challenges/create — description and mode (Run 62)', () => {
  it('should store description and mode in the created challenge', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 20, creator_id: 1, title: 'Fitness Challenge',
      description: 'Get fit in 30 days', mode: 'fitness', target_value: 30,
    });
    db.execute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({
        creatorId: 1, title: 'Fitness Challenge',
        description: 'Get fit in 30 days', mode: 'fitness', targetValue: 30,
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.description).toBe('Get fit in 30 days');
    expect(res.body.data.mode).toBe('fitness');
    // Verify description and mode are included in the INSERT query
    expect(db.queryOne).toHaveBeenCalledWith(
      expect.stringContaining('description'),
      expect.arrayContaining(['Get fit in 30 days', 'fitness']),
    );
  });

  it('should allow null description and mode', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 21, creator_id: 1, title: 'Simple Challenge',
      description: null, mode: null, target_value: null,
    });
    db.execute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1, title: 'Simple Challenge' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Simple Challenge');
    expect(res.body.data.description).toBeNull();
    expect(res.body.data.mode).toBeNull();
  });
});
