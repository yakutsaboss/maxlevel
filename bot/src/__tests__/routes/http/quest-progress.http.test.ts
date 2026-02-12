/**
 * HTTP integration tests for quest progress route
 * (bot/src/api/routes/quest-progress.ts)
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
  invalidateUserCache: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: vi.fn(),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

const mockCheckAchievements = vi.fn().mockResolvedValue([]);
vi.mock('../../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: (...args: any[]) => mockCheckAchievements(...args),
}));

const mockUpdateStreak = vi.fn().mockResolvedValue(undefined);
vi.mock('../../../utils/streak.js', () => ({
  updateStreak: (...args: any[]) => mockUpdateStreak(...args),
}));

const mockAwardXp = vi.fn();
vi.mock('../../../utils/xpAward.js', () => ({
  awardXp: (...args: any[]) => mockAwardXp(...args),
  LEVEL_XP_DIVISOR: 500,
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

import { questProgressRouter } from '../../../api/routes/quest-progress.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/quests', questProgressRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Helpers ───────────────────────────────────────────────────────

const QUEST_INSTANCE = (overrides: Record<string, any> = {}) => ({
  id: 1,
  user_id: 42,
  status: 'pending',
  current_progress: 0,
  xp_reward: 50,
  title: 'Daily Push-ups',
  mode_id: 1,
  target: 5,
  ...overrides,
});

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  mockCheckAchievements.mockResolvedValue([]);
  mockUpdateStreak.mockResolvedValue(undefined);
});

describe('PATCH /api/quests/:questId/progress', () => {
  it('should update progress without completing when below target', async () => {
    const instance = QUEST_INSTANCE({ target: 5 });
    mockQueryOne
      .mockResolvedValueOnce(instance)              // fetch quest
      .mockResolvedValueOnce({ id: 1 });             // UPDATE RETURNING

    const res = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: 3 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.progress).toBe(3);
    expect(res.body.data.target).toBe(5);
    expect(res.body.data.xpEarned).toBe(0);
    expect(res.body.data.leveledUp).toBe(false);
    // Should NOT have called transaction or awardXp
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockAwardXp).not.toHaveBeenCalled();
  });

  it('should auto-complete and award XP when progress reaches target', async () => {
    const instance = QUEST_INSTANCE({ target: 5, xp_reward: 100 });
    mockQueryOne.mockResolvedValueOnce(instance);    // fetch quest

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),  // UPDATE
      };
      return fn(mockClient);
    });
    mockAwardXp.mockResolvedValueOnce({
      totalXp: 600, newLevel: 2, oldLevel: 1, leveledUp: true,
    });

    const res = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: 5 })
      .expect(200);

    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.progress).toBe(5);
    expect(res.body.data.xpEarned).toBe(100);
    expect(res.body.data.newLevel).toBe(2);
    expect(res.body.data.leveledUp).toBe(true);
    expect(mockAwardXp).toHaveBeenCalled();
    expect(mockUpdateStreak).toHaveBeenCalledWith(42, 1);
    expect(mockCheckAchievements).toHaveBeenCalledWith(42);
  });

  it('should clamp progress to target when exceeding it', async () => {
    const instance = QUEST_INSTANCE({ target: 3, xp_reward: 75 });
    mockQueryOne.mockResolvedValueOnce(instance);

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rowCount: 1 }),
      };
      return fn(mockClient);
    });
    mockAwardXp.mockResolvedValueOnce({
      totalXp: 200, newLevel: 1, oldLevel: 1, leveledUp: false,
    });

    const res = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: 10 })  // exceeds target of 3
      .expect(200);

    // Progress should be clamped to target, triggering auto-completion
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.progress).toBe(3);
    expect(res.body.data.target).toBe(3);
    expect(res.body.data.xpEarned).toBe(75);
  });

  it('should return 403 when user does not own the quest', async () => {
    // authorizeUser sets req.dbUser.id = 42, but quest belongs to user 99
    const instance = QUEST_INSTANCE({ user_id: 99 });
    mockQueryOne.mockResolvedValueOnce(instance);

    const res = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: 1 })
      .expect(403);

    expect(res.body.error).toContain('permission');
  });

  it('should return 400 when progress is missing or invalid', async () => {
    // Missing progress
    const res1 = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({})
      .expect(400);
    expect(res1.body.error).toContain('progress');

    // Negative progress
    const res2 = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: -5 })
      .expect(400);
    expect(res2.body.error).toContain('progress');

    // Non-numeric progress
    const res3 = await request(buildApp())
      .patch('/api/quests/1/progress')
      .send({ progress: 'abc' })
      .expect(400);
    expect(res3.body.error).toContain('progress');
  });

  it('should return 404 when quest not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/quests/999/progress')
      .send({ progress: 1 })
      .expect(404);

    expect(res.body.error).toContain('not found');
  });
});
