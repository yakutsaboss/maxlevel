/**
 * HTTP integration tests for achievement routes (bot/src/api/routes/achievements.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

// ─── Mocks ─────────────────────────────────────────────────────────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../../api/middleware/auth.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

vi.mock('../../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue([]),
}));

const mockAwardXp = vi.fn();
vi.mock('../../../utils/xpAward.js', () => ({
  awardXp: (...args: any[]) => mockAwardXp(...args),
  LEVEL_XP_DIVISOR: 500,
}));

import { getMockDb } from '../../helpers/httpMocks.js';
const { query: mockQuery, queryOne: mockQueryOne, transaction: mockTransaction } = getMockDb();

// ─── Import router after mocks ─────────────────────────────────────

import { achievementRouter } from '../../../api/routes/achievements.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/achievements', achievementRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/achievements', () => {
  it('should return 200 with all achievements', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, name: 'First Quest', description: 'Complete 1 quest', icon: '🏆', xp_reward: 50, rarity: 'common', criteria: {}, category: 'general' },
      { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 200, rarity: 'rare', criteria: {}, category: 'general' },
    ]);

    const res = await request(buildApp())
      .get('/api/achievements')
      .expect(200);

    // Route: successResponse(achievements) — data IS the array
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('First Quest');
  });

  it('should return empty array when no achievements exist', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/achievements')
      .expect(200);

    expect(res.body.data).toHaveLength(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/achievements')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/achievements/users/:userId', () => {
  it('should return 200 with user achievements and progress', async () => {
    // User achievements query
    mockQuery.mockResolvedValueOnce([
      { id: 1, achievement_id: 10, name: 'Early Bird', description: 'desc', icon: '🐦', xp_reward: 100, rarity: 'common', unlocked_at: '2025-06-01' },
    ]);
    // Total achievements count (cached call executes fn → queryOne)
    mockQueryOne.mockResolvedValueOnce({ total: 5 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.data.achievements).toHaveLength(1);
    expect(res.body.data.unlocked).toBe(1);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.progress).toBe(20);
  });

  it('should return 0 progress when no achievements unlocked', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQueryOne.mockResolvedValueOnce({ total: 10 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.data.unlocked).toBe(0);
    expect(res.body.data.progress).toBe(0);
  });

  it('should handle zero total achievements gracefully', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQueryOne.mockResolvedValueOnce({ total: 0 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.data.progress).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('POST /api/achievements/users/:userId/:achievementId/unlock', () => {
  it('should unlock achievement and return 200 with level-up info', async () => {
    mockAwardXp.mockResolvedValueOnce({ totalXp: 600, newLevel: 2, oldLevel: 1, leveledUp: true });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Hero', xp_bonus: 100 }] })  // achievement lookup
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }),  // INSERT ON CONFLICT
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/achievements/users/1/5/unlock')
      .expect(200);

    expect(res.body.data.message).toBe('Achievement unlocked successfully');
    expect(res.body.data.achievement.name).toBe('Hero');
    expect(res.body.data.xpEarned).toBe(100);
    expect(res.body.data.totalXp).toBe(600);
    expect(res.body.data.newLevel).toBe(2);
    expect(res.body.data.leveledUp).toBe(true);
    expect(mockAwardXp).toHaveBeenCalledWith(expect.anything(), 1, 100);
  });

  it('should return 404 when achievement does not exist', async () => {
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }),  // no achievement found
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/achievements/users/1/999/unlock')
      .expect(404);

    expect(res.body.error).toContain('not found');
  });

  it('should return 400 when achievement already unlocked', async () => {
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Hero', xp_bonus: 100 }] })  // achievement exists
          .mockResolvedValueOnce({ rows: [] }),  // INSERT returns nothing (conflict)
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/achievements/users/1/5/unlock')
      .expect(400);

    expect(res.body.error).toBe('Achievement already unlocked');
  });
});
