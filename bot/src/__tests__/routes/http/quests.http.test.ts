/**
 * HTTP integration tests for quest routes (bot/src/api/routes/quests.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
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

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/streak.js', () => ({
  updateStreak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (req: any, _res: any, next: any) => {
    // Set req.dbUser for ownership checks in PATCH /progress
    req.dbUser = { id: 10 };
    next();
  },
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ─────────────────────────────────────

import { questRouter } from '../../../api/routes/quests.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/quests', questRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/quests/users/:userId/active', () => {
  it('should return 200 with active quests', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, name: 'Morning Run', status: 'in_progress', quest_type: 'daily' },
      { id: 2, name: 'Drink Water', status: 'pending', quest_type: 'daily' },
    ]);

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(200);

    expect(res.body.data.quests).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
  });

  it('should return empty array when no active quests', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(200);

    expect(res.body.data.quests).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });

  it('should return 500 when exception is thrown', async () => {
    db.query.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/quests/users/:userId/completed', () => {
  it('should return 200 with completed quests', async () => {
    db.query.mockResolvedValueOnce([
      { id: 3, name: 'Read 30min', xp_awarded: 50, quest_type: 'daily' },
    ]);

    const res = await request(buildApp())
      .get('/api/quests/users/42/completed')
      .expect(200);

    expect(res.body.data.quests).toHaveLength(1);
    expect(res.body.data.count).toBe(1);
  });

  it('should pass limit query parameter', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/quests/users/42/completed?limit=10')
      .expect(200);

    // Verify limit was passed (2nd arg in the query call)
    expect(db.query).toHaveBeenCalledTimes(1);
    const callArgs = db.query.mock.calls[0];
    expect(callArgs[1]).toContain(10);
  });
});

describe('POST /api/quests/:questId/complete', () => {
  it('should return 200 with XP and level data on success', async () => {
    // All logic now runs inside the transaction (SELECT FOR UPDATE + UPDATE + awardXp)
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          // 1st: SELECT FOR UPDATE (fetch quest instance)
          .mockResolvedValueOnce({ rows: [{
            id: 7, user_id: 1, status: 'in_progress',
            title: 'Walk', xp_reward: 50, quest_type: 'daily',
            difficulty: 'easy', mode_id: 1,
          }] })
          // 2nd: UPDATE quest_instances
          .mockResolvedValueOnce({})
          // 3rd: UPDATE users (awardXp) — total_xp=1000, current_level=2 → newLevel=3
          .mockResolvedValueOnce({ rows: [{ total_xp: 1000, current_level: 2 }] })
          // 4th: UPDATE users SET current_level (level-up)
          .mockResolvedValueOnce({}),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(200);

    expect(res.body.data.message).toBe('Quest completed successfully');
    expect(res.body.data.xpEarned).toBe(50);
    expect(res.body.data.newLevel).toBe(3);
    expect(res.body.data.leveledUp).toBe(true);
  });

  it('should return 404 when quest not found', async () => {
    // SELECT FOR UPDATE returns no rows → NotFoundError thrown inside transaction
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/quests/999/complete')
      .expect(404);

    expect(res.body.error).toContain('not found');
  });

  it('should return 400 when quest already completed', async () => {
    // SELECT FOR UPDATE returns completed quest → BadRequestError inside transaction
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{
          id: 7, user_id: 1, status: 'completed',
          title: 'Walk', xp_reward: 50, quest_type: 'daily',
          difficulty: 'easy', mode_id: 1,
        }] }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(400);

    expect(res.body.error).toContain('already completed');
  });

  it('should return 500 when database throws', async () => {
    db.transaction.mockRejectedValueOnce(new Error('Internal failure'));

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('POST /api/quests/users/:userId/assign', () => {
  it('should return 200 when assigning daily quests', async () => {
    // query 1: user active modes
    db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
    // query 2: fitness level from mode_configs (empty → beginner default)
    db.query.mockResolvedValueOnce([]);
    // query 3: available quests
    db.query.mockResolvedValueOnce([
      { id: 1, title: 'Run', description: 'Go run', xp_reward: 50, quest_type: 'daily', difficulty: 'easy', mode_id: 1 },
      { id: 2, title: 'Stretch', description: 'Stretch out', xp_reward: 30, quest_type: 'daily', difficulty: 'easy', mode_id: 1 },
      { id: 3, title: 'Walk', description: 'Take a walk', xp_reward: 40, quest_type: 'daily', difficulty: 'easy', mode_id: 1 },
    ]);
    // query 3: batch INSERT quest_instances RETURNING
    db.query.mockResolvedValueOnce([
      { id: 101, quest_id: 1 }, { id: 102, quest_id: 2 }, { id: 103, quest_id: 3 },
    ]);

    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({ frequency: 'daily' })
      .expect(200);

    expect(res.body.data.message).toContain('3');
    expect(res.body.data.message).toContain('daily');
    expect(res.body.data.quests).toHaveLength(3);
  });

  it('should return 400 when frequency is missing', async () => {
    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({})
      .expect(400);

    expect(res.body.error).toContain('frequency');
  });

  it('should return 400 when frequency is invalid', async () => {
    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({ frequency: 'monthly' })
      .expect(400);

    expect(res.body.error).toContain('frequency');
  });
});

describe('PATCH /api/quests/:questId/progress', () => {
  it('should return 200 with updated progress', async () => {
    const quest = {
      id: 5, user_id: 10, status: 'in_progress',
      current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
    };
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [quest] })  // SELECT FOR UPDATE
          .mockResolvedValueOnce({ rowCount: 1 }),    // UPDATE progress
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 0 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.leveledUp).toBe(false);
  });

  it('should auto-complete when progress reaches target', async () => {
    const quest = {
      id: 5, user_id: 10, status: 'in_progress',
      current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
    };
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [quest] })                                // SELECT FOR UPDATE
          .mockResolvedValueOnce({})                                                // UPDATE quest_instances
          .mockResolvedValueOnce({ rows: [{ total_xp: 500, current_level: 1 }] })  // awardXp: UPDATE users RETURNING
          .mockResolvedValueOnce({}),                                               // awardXp: UPDATE users SET current_level (level-up)
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.leveledUp).toBe(true);
    expect(res.body.data.xpEarned).toBe(100);
  });

  it('should return 400 for invalid quest ID', async () => {
    const res = await request(buildApp())
      .patch('/api/quests/abc/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(400);

    expect(res.body.error).toContain('Invalid quest ID');
  });

  it('should return 400 when progress is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({})
      .expect(400);

    expect(res.body.error).toContain('progress');
  });

  it('should return 400 when progress is negative', async () => {
    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: -1 })
      .expect(400);

    expect(res.body.error).toContain('progress');
  });

  it('should return 404 when quest not found', async () => {
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .patch('/api/quests/999/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(404);

    expect(res.body.error).toContain('not found');
  });

  it('should return 403 when quest belongs to another user', async () => {
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{
          id: 5, user_id: 99, status: 'in_progress',
          current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
        }] }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(403);

    expect(res.body.error).toContain('permission');
  });

  it('should return 400 when quest is already completed', async () => {
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{
          id: 5, user_id: 10, status: 'completed',
          current_progress: 1, xp_reward: 100, title: 'Walk', target: 1,
        }] }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(400);

    expect(res.body.error).toContain('already completed');
  });

  it('should return 500 when database throws', async () => {
    db.transaction.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});
