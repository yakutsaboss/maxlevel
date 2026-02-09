/**
 * HTTP integration tests for achievement routes (bot/src/api/routes/achievements.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

// ─── Mocks ─────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: vi.fn(),
  transaction: (...args: any[]) => mockTransaction(...args),
  getPool: vi.fn(),
}));

vi.mock('../../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: vi.fn(),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { achievementRouter } from '../../../api/routes/achievements.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/achievements', achievementRouter);
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

    expect(res.body.achievements).toHaveLength(2);
    expect(res.body.count).toBe(2);
    expect(res.body.achievements[0].name).toBe('First Quest');
  });

  it('should return empty array when no achievements exist', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/achievements')
      .expect(200);

    expect(res.body.achievements).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/achievements')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('GET /api/achievements/users/:userId', () => {
  it('should return 200 with user achievements and progress', async () => {
    // User achievements query
    mockQuery.mockResolvedValueOnce([
      { id: 1, achievement_id: 10, name: 'Early Bird', description: 'desc', icon: '🐦', xp_reward: 100, rarity: 'common', unlocked_at: '2025-06-01' },
    ]);
    // Total achievements count (cached call executes fn)
    mockQueryOne.mockResolvedValueOnce({ total: 5 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.achievements).toHaveLength(1);
    expect(res.body.unlocked).toBe(1);
    expect(res.body.total).toBe(5);
    expect(res.body.progress).toBe(20);
  });

  it('should return 0 progress when no achievements unlocked', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQueryOne.mockResolvedValueOnce({ total: 10 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.unlocked).toBe(0);
    expect(res.body.progress).toBe(0);
  });

  it('should handle zero total achievements gracefully', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQueryOne.mockResolvedValueOnce({ total: 0 });

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(200);

    expect(res.body.progress).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/achievements/users/1')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('POST /api/achievements/users/:userId/:achievementId/unlock', () => {
  it('should unlock achievement and return 200', async () => {
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 5, name: 'Hero', xp_bonus: 100 }] })  // achievement lookup
          .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // INSERT ON CONFLICT
          .mockResolvedValueOnce({ rows: [] }),  // UPDATE users XP
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/achievements/users/1/5/unlock')
      .expect(200);

    expect(res.body.message).toBe('Achievement unlocked successfully');
    expect(res.body.achievement.name).toBe('Hero');
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

    expect(res.body.error).toBe('Not Found');
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

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toBe('Achievement already unlocked');
  });
});
