/**
 * Integration test: Achievement criteria met → achievement unlocked → trophy awarded → notification
 *
 * Tests the full achievement/trophy lifecycle through HTTP routes.
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

vi.mock('../../utils/xpAward.js', () => ({
  awardXp: vi.fn().mockResolvedValue({ totalXp: 500, newLevel: 2, leveledUp: true }),
}));

vi.mock('../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue([
    { id: 5, name: 'Streak Master', description: '7-day streak', rarity: 'epic' },
  ]),
}));

// ─── Imports after mocks ──────────────────────────────────────────────

import { achievementRouter } from '../../api/routes/achievements.js';
import { trophyRouter } from '../../api/routes/trophies.js';

// ─── Mock refs ────────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build integration test app ───────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/achievements', achievementRouter);
  app.use('/api/trophies', trophyRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ────────────────────────────────────────────────────────────

beforeEach(async () => {
  vi.resetAllMocks();
  // Re-setup mocks that were cleared by resetAllMocks
  const { awardXp } = await import('../../utils/xpAward.js');
  vi.mocked(awardXp).mockResolvedValue({ totalXp: 500, newLevel: 2, leveledUp: true });
  const { checkAndUnlockAchievements } = await import('../../utils/achievementEngine.js');
  vi.mocked(checkAndUnlockAchievements).mockResolvedValue([
    { id: 5, name: 'Streak Master', description: '7-day streak', rarity: 'epic' },
  ]);
});

describe('Achievement → Trophy Integration Flow', () => {
  const app = buildApp();

  describe('Step 1: Browse Achievements Catalog', () => {
    it('should list all achievements', async () => {
      db.query.mockResolvedValueOnce([
        { id: 1, name: 'First Steps', description: 'Complete your first quest', icon: '🎯', xp_reward: 50, rarity: 'common', criteria: { type: 'quest_count', threshold: 1 }, category: 'quest' },
        { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 200, rarity: 'epic', criteria: { type: 'streak', threshold: 7 }, category: 'streak' },
        { id: 3, name: 'Social Butterfly', description: 'Make 10 friends', icon: '🦋', xp_reward: 150, rarity: 'rare', criteria: { type: 'friends', threshold: 10 }, category: 'social' },
      ]);

      const res = await request(app).get('/api/achievements');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].name).toBe('First Steps');
      expect(res.body.data[1].rarity).toBe('epic');
    });

    it('should list achievement categories', async () => {
      db.query.mockResolvedValueOnce([
        { category: 'fitness' },
        { category: 'quest' },
        { category: 'streak' },
      ]);

      const res = await request(app).get('/api/achievements/categories');

      expect(res.status).toBe(200);
      expect(res.body.data).toContain('fitness');
      expect(res.body.data).toContain('quest');
      expect(res.body.data).toContain('streak');
      // Should also include hardcoded categories
      expect(res.body.data).toContain('social');
      expect(res.body.data).toContain('xp');
    });
  });

  describe('Step 2: Check User Achievement Progress', () => {
    it('should get user unlocked achievements with progress', async () => {
      // User achievements query
      db.query.mockResolvedValueOnce([
        {
          id: 10, achievement_id: 1, name: 'First Steps', description: 'Complete first quest',
          icon: '🎯', xp_reward: 50, rarity: 'common', unlocked_at: '2026-02-15T10:00:00Z',
        },
      ]);
      // Total count (cached)
      db.queryOne.mockResolvedValueOnce({ total: 45 });

      const res = await request(app).get('/api/achievements/users/1');

      expect(res.status).toBe(200);
      expect(res.body.data.achievements).toHaveLength(1);
      expect(res.body.data.unlocked).toBe(1);
      expect(res.body.data.total).toBe(45);
      expect(res.body.data.progress).toBe(2); // 1/45 = ~2%
    });

    it('should get available (not yet unlocked) achievements', async () => {
      db.query.mockResolvedValueOnce([
        { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 200, rarity: 'epic', criteria: { type: 'streak', threshold: 7 } },
        { id: 3, name: 'Social Butterfly', description: 'Make 10 friends', icon: '🦋', xp_reward: 150, rarity: 'rare', criteria: { type: 'friends', threshold: 10 } },
      ]);

      const res = await request(app).get('/api/achievements/users/1/available');

      expect(res.status).toBe(200);
      expect(res.body.data.achievements).toHaveLength(2);
      expect(res.body.data.count).toBe(2);
    });

    it('should get recent achievements', async () => {
      db.query.mockResolvedValueOnce([
        {
          id: 10, achievement_id: 1, name: 'First Steps', icon: '🎯',
          xp_reward: 50, rarity: 'common', unlocked_at: '2026-02-18T09:00:00Z',
        },
      ]);

      const res = await request(app).get('/api/achievements/users/1/recent');

      expect(res.status).toBe(200);
      expect(res.body.data.achievements).toHaveLength(1);
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('Step 3: Unlock Achievement', () => {
    it('should unlock an achievement and award XP', async () => {
      db.transaction.mockImplementation(async (fn: (client: any) => Promise<any>) => {
        const client = {
          query: vi.fn()
            // Achievement lookup
            .mockResolvedValueOnce({
              rows: [{ id: 2, name: 'Streak Master', description: '7-day streak', xp_bonus: 200 }],
            })
            // INSERT ON CONFLICT RETURNING
            .mockResolvedValueOnce({
              rows: [{ id: 20, user_id: 1, achievement_id: 2, unlocked_at: '2026-02-18T12:00:00Z' }],
            }),
        };
        return fn(client);
      });

      const res = await request(app)
        .post('/api/achievements/users/1/2/unlock');

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain('unlocked');
      expect(res.body.data.achievement.name).toBe('Streak Master');
      expect(res.body.data.xpEarned).toBe(200);
    });

    it('should return 404 for non-existent achievement', async () => {
      db.transaction.mockImplementation(async (fn: (client: any) => Promise<any>) => {
        const client = {
          query: vi.fn().mockResolvedValueOnce({ rows: [] }), // not found
        };
        return fn(client);
      });

      const res = await request(app)
        .post('/api/achievements/users/1/999/unlock');

      expect(res.status).toBe(404);
    });

    it('should return 400 for already-unlocked achievement', async () => {
      db.transaction.mockImplementation(async (fn: (client: any) => Promise<any>) => {
        const client = {
          query: vi.fn()
            .mockResolvedValueOnce({
              rows: [{ id: 1, name: 'First Steps', xp_bonus: 50 }],
            })
            .mockResolvedValueOnce({ rows: [] }), // ON CONFLICT DO NOTHING → 0 rows
        };
        return fn(client);
      });

      const res = await request(app)
        .post('/api/achievements/users/1/1/unlock');

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already unlocked');
    });
  });

  describe('Step 4: Auto-check Achievements', () => {
    it('should check and unlock achievements via engine', async () => {
      const res = await request(app)
        .post('/api/achievements/users/1/check');

      expect(res.status).toBe(200);
      expect(res.body.data.newAchievements).toHaveLength(1);
      expect(res.body.data.newAchievements[0].name).toBe('Streak Master');
      expect(res.body.data.count).toBe(1);
    });
  });

  describe('Step 5: Trophy Catalog & Earned Trophies', () => {
    it('should list all available trophies', async () => {
      db.query.mockResolvedValueOnce([
        { id: 1, name: 'First Steps', description: 'Complete 1 quest', icon_emoji: '🏆', rarity: 'common', criteria: { type: 'quest_count', threshold: 1 }, sort_order: 1 },
        { id: 2, name: 'Quest Master', description: 'Complete 100 quests', icon_emoji: '🏅', rarity: 'legendary', criteria: { type: 'quest_count', threshold: 100 }, sort_order: 2 },
        { id: 3, name: 'Social Star', description: '10 friends', icon_emoji: '⭐', rarity: 'rare', criteria: { type: 'friend_count', threshold: 10 }, sort_order: 3 },
      ]);

      const res = await request(app).get('/api/trophies');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0].name).toBe('First Steps');
      expect(res.body.data[1].rarity).toBe('legendary');
    });

    it('should list user earned trophies', async () => {
      db.queryOne.mockResolvedValueOnce({ id: 1 }); // user exists
      db.query.mockResolvedValueOnce([
        {
          id: 10, trophy_id: 1, name: 'First Steps', description: 'Complete 1 quest',
          icon_emoji: '🏆', rarity: 'common', criteria: { type: 'quest_count', threshold: 1 },
          earned_at: '2026-02-17T15:00:00Z',
        },
      ]);

      const res = await request(app).get('/api/trophies/1');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('First Steps');
      expect(res.body.data[0].earned_at).toBeTruthy();
    });

    it('should return 404 for non-existent user trophies', async () => {
      db.queryOne.mockResolvedValueOnce(null); // user not found

      const res = await request(app).get('/api/trophies/999');

      expect(res.status).toBe(404);
    });
  });

  describe('Step 6: Trophy Check & Auto-Award', () => {
    it('should check and award trophies based on user stats', async () => {
      // User stats aggregation
      db.queryOne.mockResolvedValueOnce({
        level: 5,
        total_xp: 2500,
        current_streak: 10,
        quests_completed: 25,
        friend_count: 3,
        achievement_count: 8,
        mode_count: 3,
        challenge_created: 1,
        challenge_wins: 0,
        has_purchase: false,
        created_at: '2026-01-01T00:00:00Z',
      });

      // Unearned trophies
      db.query.mockResolvedValueOnce([
        { id: 2, name: 'Quest Master', icon_emoji: '🏅', rarity: 'legendary', criteria: { type: 'quest_count', threshold: 100 }, sort_order: 2 },
        { id: 4, name: 'Streak Hero', icon_emoji: '🔥', rarity: 'epic', criteria: { type: 'streak_days', threshold: 7 }, sort_order: 4 },
        { id: 5, name: 'Level 5', icon_emoji: '⭐', rarity: 'rare', criteria: { type: 'level', threshold: 5 }, sort_order: 5 },
      ]);

      // Award trophy inserts
      db.queryOne
        .mockResolvedValueOnce({ id: 20 }) // Streak Hero awarded
        .mockResolvedValueOnce({ id: 21 }); // Level 5 awarded

      const res = await request(app).get('/api/trophies/1/check');

      expect(res.status).toBe(200);
      // Should award Streak Hero (streak 10 >= 7) and Level 5 (level 5 >= 5)
      // but NOT Quest Master (quests 25 < 100)
      expect(res.body.data).toHaveLength(2);
      const awardedNames = res.body.data.map((t: any) => t.name);
      expect(awardedNames).toContain('Streak Hero');
      expect(awardedNames).toContain('Level 5');
      expect(awardedNames).not.toContain('Quest Master');
    });

    it('should handle user with no new trophies to award', async () => {
      db.queryOne.mockResolvedValueOnce({
        level: 1, total_xp: 50, current_streak: 0,
        quests_completed: 0, friend_count: 0, achievement_count: 0,
        mode_count: 1, challenge_created: 0, challenge_wins: 0,
        has_purchase: false, created_at: '2026-02-18T00:00:00Z',
      });
      db.query.mockResolvedValueOnce([
        { id: 1, name: 'First Steps', criteria: { type: 'quest_count', threshold: 1 }, sort_order: 1 },
      ]);

      const res = await request(app).get('/api/trophies/1/check');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('should return 404 for non-existent user in trophy check', async () => {
      db.queryOne.mockResolvedValueOnce(null);

      const res = await request(app).get('/api/trophies/999/check');

      expect(res.status).toBe(404);
    });

    it('should award early_adopter trophy based on creation date', async () => {
      db.queryOne.mockResolvedValueOnce({
        level: 1, total_xp: 0, current_streak: 0,
        quests_completed: 0, friend_count: 0, achievement_count: 0,
        mode_count: 1, challenge_created: 0, challenge_wins: 0,
        has_purchase: false, created_at: '2025-12-01T00:00:00Z',
      });
      db.query.mockResolvedValueOnce([
        { id: 10, name: 'Early Adopter', criteria: { type: 'early_adopter', threshold: '2026-03-01T00:00:00Z' }, sort_order: 10 },
      ]);
      db.queryOne.mockResolvedValueOnce({ id: 30 });

      const res = await request(app).get('/api/trophies/1/check');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Early Adopter');
    });

    it('should award first_purchase trophy', async () => {
      db.queryOne.mockResolvedValueOnce({
        level: 1, total_xp: 0, current_streak: 0,
        quests_completed: 0, friend_count: 0, achievement_count: 0,
        mode_count: 1, challenge_created: 0, challenge_wins: 0,
        has_purchase: true, created_at: '2026-02-01T00:00:00Z',
      });
      db.query.mockResolvedValueOnce([
        { id: 11, name: 'First Purchase', criteria: { type: 'first_purchase' }, sort_order: 11 },
      ]);
      db.queryOne.mockResolvedValueOnce({ id: 31 });

      const res = await request(app).get('/api/trophies/1/check');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('First Purchase');
    });
  });
});
