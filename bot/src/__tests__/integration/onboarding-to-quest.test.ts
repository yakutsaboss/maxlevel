/**
 * Integration test: Full onboarding → mode selection → quest assignment → quest completion → XP + streak
 *
 * Tests the complete user journey from registration through quest completion.
 * Mocks DB layer but exercises full Express HTTP route chain via supertest.
 *
 * NOTE: Uses vitest globals (no `import from 'vitest'`) — required for vitest 4.x with globals: true.
 */

import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../helpers/testApp.js';
import { getMockDb } from '../helpers/httpMocks.js';

// ─── Mocks (hoisted) ─────────────────────────────────────────────────

vi.mock('../../utils/db.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../utils/cache.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../utils/pythonTools.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../api/middleware/auth.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../api/middleware/rateLimiter.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockRateLimiters().module);

vi.mock('../../api/middleware/premiumGate.js', () => ({
  getUserEffectiveTier: vi.fn().mockResolvedValue('free'),
  MODE_LIMITS: { free: 3, subscriber: 6, premium: 12 },
}));

vi.mock('../../utils/streak.js', () => ({
  updateStreak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/xpAward.js', () => ({
  awardXp: vi.fn().mockResolvedValue({ totalXp: 100, newLevel: 1, leveledUp: false }),
}));

vi.mock('../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

// ─── Imports after mocks ──────────────────────────────────────────────

import { userRouter } from '../../api/routes/users.js';
import { modeRouter } from '../../api/routes/modes.js';
import { questRouter } from '../../api/routes/quests.js';

// ─── Mock refs ────────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build integration test app with all routers ──────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/users', userRouter);
  app.use('/api/modes', modeRouter);
  app.use('/api/quests', questRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Onboarding → Quest Integration Flow', () => {
  const app = buildApp();

  describe('Step 1: User Registration', () => {
    it('should register a new user via POST /api/users', async () => {
      db.queryOne.mockResolvedValueOnce({
        id: 1,
        telegram_id: 111222333,
        username: 'testuser',
        first_name: 'Alice',
        total_xp: 0,
        current_level: 1,
      });

      const res = await request(app)
        .post('/api/users')
        .send({ telegramId: 111222333, firstName: 'Alice', username: 'testuser' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.telegram_id).toBe(111222333);
      expect(res.body.data.user.first_name).toBe('Alice');
    });

    it('should reject registration without required fields', async () => {
      const res = await request(app)
        .post('/api/users')
        .send({ username: 'incomplete' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle upsert on duplicate telegram_id', async () => {
      db.queryOne.mockResolvedValueOnce({
        id: 1,
        telegram_id: 111222333,
        username: 'updated_user',
        first_name: 'Alice Updated',
      });

      const res = await request(app)
        .post('/api/users')
        .send({ telegramId: 111222333, firstName: 'Alice Updated', username: 'updated_user' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.first_name).toBe('Alice Updated');
    });
  });

  describe('Step 2: Mode Selection', () => {
    it('should list all available modes via GET /api/modes', async () => {
      db.query.mockResolvedValueOnce([
        { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
        { id: 2, name: 'hydration', display_name: 'Hydration', description: 'Drink water', icon: '💧' },
        { id: 3, name: 'finance', display_name: 'Finance', description: 'Track spending', icon: '💰' },
      ]);

      const res = await request(app).get('/api/modes');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.modes).toHaveLength(3);
      expect(res.body.data.count).toBe(3);
    });

    it('should get user active modes via GET /api/users/:userId/modes', async () => {
      db.query.mockResolvedValueOnce([
        { id: 10, user_id: 1, mode_id: 1, is_active: true, name: 'fitness', display_name: 'Fitness', icon: '💪' },
        { id: 11, user_id: 1, mode_id: 2, is_active: true, name: 'hydration', display_name: 'Hydration', icon: '💧' },
      ]);

      const res = await request(app).get('/api/modes/users/1');

      expect(res.status).toBe(200);
      expect(res.body.data.modes).toHaveLength(2);
      expect(res.body.data.count).toBe(2);
    });

    it('should get mode summary with quest counts', async () => {
      db.query.mockResolvedValueOnce([
        { id: 1, name: 'fitness', display_name: 'Fitness', icon: '💪', active_quests: 2, completed_quests: 5 },
        { id: 2, name: 'hydration', display_name: 'Hydration', icon: '💧', active_quests: 1, completed_quests: 3 },
      ]);

      const res = await request(app).get('/api/modes/users/1/summary');

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toHaveLength(2);
      expect(res.body.data.summary[0].active_quests).toBe(2);
      expect(res.body.data.summary[0].completed_quests).toBe(5);
    });
  });

  describe('Step 3: Quest Retrieval', () => {
    it('should get active quests (initially empty)', async () => {
      db.query.mockResolvedValueOnce([]);

      const res = await request(app).get('/api/quests/users/1/active');

      expect(res.status).toBe(200);
      expect(res.body.data.quests).toEqual([]);
      expect(res.body.data.count).toBe(0);
    });

    it('should get active quests with data after assignment', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 100, quest_id: 5, name: 'Morning Jog', description: 'Go for a 20min jog',
          xp_reward: 50, quest_type: 'daily', difficulty: 'easy',
          mode_id: 1, mode_name: 'fitness', mode_icon: '💪',
          status: 'pending', instance_date: '2026-02-18', check_in_count: 0, target: 1,
        },
        {
          id: 101, quest_id: 8, name: 'Drink 8 glasses', description: 'Drink 8 glasses of water',
          xp_reward: 30, quest_type: 'daily', difficulty: 'easy',
          mode_id: 2, mode_name: 'hydration', mode_icon: '💧',
          status: 'pending', instance_date: '2026-02-18', check_in_count: 0, target: 1,
        },
      ]);

      const res = await request(app).get('/api/quests/users/1/active');

      expect(res.status).toBe(200);
      expect(res.body.data.quests).toHaveLength(2);
      expect(res.body.data.quests[0].name).toBe('Morning Jog');
      expect(res.body.data.quests[1].mode_name).toBe('hydration');
    });

    it('should get quest stats', async () => {
      db.queryOne
        .mockResolvedValueOnce({ total: 5 })   // total_completed
        .mockResolvedValueOnce({ total: 2 })   // active_quests
        .mockResolvedValueOnce({ total: 3 })   // daily_completed
        .mockResolvedValueOnce({ total: 1 });  // weekly_completed

      const res = await request(app).get('/api/quests/users/1/stats');

      expect(res.status).toBe(200);
      expect(res.body.data.total_completed).toBe(5);
      expect(res.body.data.active_quests).toBe(2);
      expect(res.body.data.daily_completed).toBe(3);
      expect(res.body.data.weekly_completed).toBe(1);
    });
  });

  describe('Step 4: Completed Quests + XP + Streak', () => {
    it('should retrieve completed quests', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 100, name: 'Morning Jog', xp_reward: 50, quest_type: 'daily',
          difficulty: 'easy', mode_name: 'fitness', mode_icon: '💪',
          xp_awarded: 50, completed_at: '2026-02-18T10:00:00Z', target: 1,
        },
      ]);

      const res = await request(app).get('/api/quests/users/1/completed');

      expect(res.status).toBe(200);
      expect(res.body.data.quests).toHaveLength(1);
      expect(res.body.data.quests[0].name).toBe('Morning Jog');
      expect(res.body.data.quests[0].xp_awarded).toBe(50);
    });

    it('should award XP via PATCH /api/users/:userId/xp', async () => {
      db.queryOne.mockResolvedValueOnce({
        total_xp: 150,
        current_level: 1,
      });

      const res = await request(app)
        .patch('/api/users/1/xp')
        .send({ amount: 50 });

      expect(res.status).toBe(200);
      expect(res.body.data.newTotal).toBe(150);
      expect(res.body.data.newLevel).toBe(1);
    });

    it('should update streak via PATCH /api/users/:userId/streak', async () => {
      db.query
        .mockResolvedValueOnce([
          { user_id: 1, mode_id: 1 },
          { user_id: 1, mode_id: 2 },
        ])
        .mockResolvedValueOnce([
          { current_streak: 3 },
          { current_streak: 7 },
        ]);

      const res = await request(app).patch('/api/users/1/streak');

      expect(res.status).toBe(200);
      expect(res.body.data.current_streak).toBe(7); // max of both streaks
    });

    it('should reject invalid XP amount', async () => {
      const res = await request(app)
        .patch('/api/users/1/xp')
        .send({ amount: -10 });

      expect(res.status).toBe(400);
    });

    it('should return 404 when awarding XP to non-existent user', async () => {
      db.queryOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .patch('/api/users/999/xp')
        .send({ amount: 50 });

      expect(res.status).toBe(404);
    });

    it('should reject invalid user ID for streak update', async () => {
      const res = await request(app).patch('/api/users/abc/streak');

      expect(res.status).toBe(400);
    });
  });
});
