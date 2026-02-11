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

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('../../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  invalidateUserCache: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: vi.fn(),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

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

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { questAssignmentRouter } from '../../../api/routes/quest-assignment.js';

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
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      // query 2: available daily quests
      mockQuery.mockResolvedValueOnce([
        DAILY_QUEST(1), DAILY_QUEST(2), DAILY_QUEST(3),
      ]);
      // queryOne: INSERT for each quest
      mockQueryOne.mockResolvedValueOnce({ id: 101 });
      mockQueryOne.mockResolvedValueOnce({ id: 102 });
      mockQueryOne.mockResolvedValueOnce({ id: 103 });

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
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      mockQuery.mockResolvedValueOnce([DAILY_QUEST(1)]);
      mockQueryOne.mockResolvedValueOnce({ id: 201 });

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily', count: 1 })
        .expect(200);

      expect(res.body.data.quests).toHaveLength(1);
      expect(res.body.data.message).toContain('1');
    });

    it('should set target based on difficulty', async () => {
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      mockQuery.mockResolvedValueOnce([
        DAILY_QUEST(1, 'easy'),
        DAILY_QUEST(2, 'medium'),
        DAILY_QUEST(3, 'hard'),
      ]);
      mockQueryOne.mockResolvedValueOnce({ id: 301 });
      mockQueryOne.mockResolvedValueOnce({ id: 302 });
      mockQueryOne.mockResolvedValueOnce({ id: 303 });

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
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      mockQuery.mockResolvedValueOnce([WEEKLY_QUEST(10), WEEKLY_QUEST(11)]);
      mockQueryOne.mockResolvedValueOnce({ id: 401 });
      mockQueryOne.mockResolvedValueOnce({ id: 402 });

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
      mockQuery.mockResolvedValueOnce([{ mode_id: 2 }]);
      mockQuery.mockResolvedValueOnce([WEEKLY_QUEST(20)]);
      mockQueryOne.mockResolvedValueOnce({ id: 501 });

      await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'weekly' })
        .expect(200);

      // Verify the second query call used mode_id from first call
      const secondQueryCall = mockQuery.mock.calls[1];
      expect(secondQueryCall[1][0]).toEqual([2]); // modeIds
      expect(secondQueryCall[1][1]).toBe(42);      // userId
      // 3rd param is weekAgo date string
      expect(secondQueryCall[1][2]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('no available quests', () => {
    it('should return 400 when no quests available for user modes', async () => {
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      mockQuery.mockResolvedValueOnce([]); // no available quests

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
      mockQuery.mockResolvedValueOnce([]); // no active modes

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(400);

      expect(res.body.error).toContain('no active modes');
    });

    it('should pass all active mode IDs to the quest query', async () => {
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }, { mode_id: 3 }, { mode_id: 5 }]);
      mockQuery.mockResolvedValueOnce([DAILY_QUEST(1)]);
      mockQueryOne.mockResolvedValueOnce({ id: 601 });

      await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(200);

      // Verify modeIds array passed to the available-quests query
      const secondQueryCall = mockQuery.mock.calls[1];
      expect(secondQueryCall[1][0]).toEqual([1, 3, 5]);
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
      mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(500);

      expect(res.body.error).toBe('Internal Server Error');
    });

    it('should return 500 when database throws on quest query', async () => {
      mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
      mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

      const res = await request(buildApp())
        .post('/api/quests/users/42/assign')
        .send({ frequency: 'daily' })
        .expect(500);

      expect(res.body.error).toBe('Internal Server Error');
    });
  });
});
