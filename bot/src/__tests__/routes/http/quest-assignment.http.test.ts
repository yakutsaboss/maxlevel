/**
 * HTTP integration tests for quest assignment route
 * (bot/src/api/routes/quest-assignment.ts)
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
    req.dbUser = { id: 42 };
    next();
  },
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ─────────────────────────────────────

import { questAssignmentRouter } from '../../../api/routes/quest-assignment.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/quests', questAssignmentRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Helpers ───────────────────────────────────────────────────────

const DAILY_QUEST = (id: number, difficulty = 'easy') => ({
  id, title: `Quest ${id}`, description: `Desc ${id}`,
  xp_reward: 50, quest_type: 'daily', difficulty, mode_id: 1,
});

const WEEKLY_QUEST = (id: number, difficulty = 'medium') => ({
  id, title: `Weekly ${id}`, description: `Weekly desc ${id}`,
  xp_reward: 100, quest_type: 'weekly', difficulty, mode_id: 1,
});

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/quests/users/:userId/assign', () => {
  describe('daily quest assignment', () => {
    it('should assign 3 daily quests by default', async () => {
      // query 1: user active modes
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      // query 2: fitness level from mode_configs (empty → beginner default)
      db.query.mockResolvedValueOnce([]);
      // query 3: available daily quests
      db.query.mockResolvedValueOnce([
        DAILY_QUEST(1), DAILY_QUEST(2), DAILY_QUEST(3),
      ]);
      // query 3: batch INSERT RETURNING
      db.query.mockResolvedValueOnce([
        { id: 101, quest_id: 1 }, { id: 102, quest_id: 2 }, { id: 103, quest_id: 3 },
      ]);

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quests).toHaveLength(3);
      expect(res.body.data.message).toContain('3');
      expect(res.body.data.message).toContain('daily');
      // Verify each assigned quest has expected shape
      const q = res.body.data.quests[0];
      expect(q).toHaveProperty('id', 101);
      expect(q).toHaveProperty('quest_id', 1);
      expect(q).toHaveProperty('title', 'Quest 1');
      expect(q).toHaveProperty('status', 'pending');
      expect(q).toHaveProperty('target', 1); // easy → target 1
    });

    it('should use custom count when provided', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([DAILY_QUEST(1)]);
      db.query.mockResolvedValueOnce([{ id: 201, quest_id: 1 }]);

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily', count: 1 })
        .expect(200);

      expect(res.body.data.quests).toHaveLength(1);
      expect(res.body.data.message).toContain('1');
    });

    it('should set target based on difficulty', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([
        DAILY_QUEST(1, 'easy'),
        DAILY_QUEST(2, 'medium'),
        DAILY_QUEST(3, 'hard'),
      ]);
      db.query.mockResolvedValueOnce([
        { id: 301, quest_id: 1 }, { id: 302, quest_id: 2 }, { id: 303, quest_id: 3 },
      ]);

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(200);

      const quests = res.body.data.quests;
      expect(quests[0].target).toBe(1);  // easy
      expect(quests[1].target).toBe(3);  // medium
      expect(quests[2].target).toBe(5);  // hard
    });
  });

  describe('weekly quest assignment', () => {
    it('should assign 2 weekly quests by default', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([WEEKLY_QUEST(10), WEEKLY_QUEST(11)]);
      db.query.mockResolvedValueOnce([
        { id: 401, quest_id: 10 }, { id: 402, quest_id: 11 },
      ]);

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'weekly' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.quests).toHaveLength(2);
      expect(res.body.data.message).toContain('2');
      expect(res.body.data.message).toContain('weekly');
      // Weekly quests use 'medium' difficulty → target 3
      expect(res.body.data.quests[0].target).toBe(3);
    });

    it('should use weekly SQL filter (past 7 days, active statuses)', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 2 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([WEEKLY_QUEST(20)]);
      db.query.mockResolvedValueOnce([{ id: 501, quest_id: 20 }]);

      await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'weekly' })
        .expect(200);

      // Verify the third query call (quest selection, after modes + fitness level)
      const questQueryCall = db.query.mock.calls[2];
      expect(questQueryCall[1][0]).toEqual([2]); // modeIds
      expect(questQueryCall[1][1]).toBe(42);      // userId
      // 3rd param is weekAgo date string
      expect(questQueryCall[1][2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('no available quests', () => {
    it('should return 400 when no quests available for user modes', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([]); // no available quests

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(400);

      expect(res.body.error).toContain('No available');
      expect(res.body.error).toContain('daily');
    });
  });

  describe('mode filtering', () => {
    it('should return 400 when user has no active modes', async () => {
      db.query.mockResolvedValueOnce([]); // no active modes

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(400);

      expect(res.body.error).toContain('no active modes');
    });

    it('should pass all active mode IDs to the quest query', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }, { mode_id: 3 }, { mode_id: 5 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockResolvedValueOnce([DAILY_QUEST(1)]);
      db.query.mockResolvedValueOnce([{ id: 601, quest_id: 1 }]);

      await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(200);

      // Verify modeIds array passed to the available-quests query (3rd call, after modes + fitness)
      const questQueryCall = db.query.mock.calls[2];
      expect(questQueryCall[1][0]).toEqual([1, 3, 5]);
    });
  });

  describe('validation errors', () => {
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

  describe('error handling', () => {
    it('should return 500 when database throws on mode query', async () => {
      db.query.mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(500);

      expect(res.body.error).toBe('Internal Server Error');
    });

    it('should return 500 when database throws on quest query', async () => {
      db.query.mockResolvedValueOnce([{ mode_id: 1 }]);
      db.query.mockResolvedValueOnce([]); // fitness level
      db.query.mockRejectedValueOnce(new Error('Query timeout'));

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(500);

      expect(res.body.error).toBe('Internal Server Error');
    });
  });
});
