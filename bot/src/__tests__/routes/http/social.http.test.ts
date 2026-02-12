/**
 * HTTP integration tests for social routes (bot/src/api/routes/social.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
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
    db.queryOne.mockResolvedValueOnce({ id: 10, creator_id: 1, title: 'Daily Steps', description: 'Walk 10k steps', mode: 'solo', target_value: 10000 });
    db.execute.mockResolvedValueOnce(undefined); // auto-join participant

    const res = await request(buildApp())
      .post('/api/social/challenges/create')
      .send({ creatorId: 1, title: 'Daily Steps', description: 'Walk 10k steps', mode: 'solo', targetValue: 10000 })
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
