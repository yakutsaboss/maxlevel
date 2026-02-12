/**
 * HTTP integration tests for quest completion route
 * (bot/src/api/routes/quest-completion.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { UnauthorizedError } from '../../../api/utils/errors.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

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

const mockAuthMiddleware = vi.fn((_req: any, _res: any, next: any) => next());

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (...args: any[]) => mockAuthMiddleware(...args),
  authorizeUser: (req: any, _res: any, next: any) => {
    req.dbUser = { id: 42 };
    next();
  },
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ─────────────────────────────────────

import { questCompletionRouter } from '../../../api/routes/quest-completion.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/quests', questCompletionRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Helpers ───────────────────────────────────────────────────────

const QUEST_INSTANCE = (overrides: Record<string, any> = {}) => ({
  id: 1,
  user_id: 42,
  status: 'pending',
  title: 'Daily Push-ups',
  xp_reward: 50,
  quest_type: 'daily',
  difficulty: 'easy',
  mode_id: 1,
  ...overrides,
});

function mockSuccessfulTransaction(instance: Record<string, any>, xpResult: Record<string, any>) {
  db.transaction.mockImplementationOnce(async (fn: any) => {
    const mockClient = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [instance] })   // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rowCount: 1 }),        // UPDATE status
    };
    return fn(mockClient);
  });
  mockAwardXp.mockResolvedValueOnce(xpResult);
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  // Restore default auth behavior after each test
  mockAuthMiddleware.mockImplementation((_req: any, _res: any, next: any) => next());
  mockCheckAchievements.mockResolvedValue([]);
  mockUpdateStreak.mockResolvedValue(undefined);
});

describe('POST /api/quests/:questId/complete', () => {
  it('should complete quest and award XP without level-up', async () => {
    const instance = QUEST_INSTANCE();
    mockSuccessfulTransaction(instance, {
      totalXp: 150, newLevel: 1, oldLevel: 1, leveledUp: false,
    });

    const res = await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Quest completed successfully');
    expect(res.body.data.xpEarned).toBe(50);
    expect(res.body.data.newLevel).toBeNull();
    expect(res.body.data.leveledUp).toBe(false);
  });

  it('should return level-up info when XP triggers level increase', async () => {
    const instance = QUEST_INSTANCE({ xp_reward: 200 });
    mockSuccessfulTransaction(instance, {
      totalXp: 600, newLevel: 2, oldLevel: 1, leveledUp: true,
    });

    const res = await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(200);

    expect(res.body.data.xpEarned).toBe(200);
    expect(res.body.data.newLevel).toBe(2);
    expect(res.body.data.leveledUp).toBe(true);
  });

  it('should return 400 when quest is already completed', async () => {
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          rows: [QUEST_INSTANCE({ status: 'completed' })],
        }),
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(400);

    expect(res.body.error).toContain('already completed');
  });

  it('should return 404 when quest instance not found', async () => {
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

  it('should return 401 when authentication fails', async () => {
    mockAuthMiddleware.mockImplementationOnce((_req: any, _res: any, next: any) => {
      next(new UnauthorizedError('Not authenticated'));
    });

    const res = await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(401);

    expect(res.body.error).toBe('Not authenticated');
  });

  it('should return 500 when transaction throws a database error', async () => {
    db.transaction.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });

  it('should call updateStreak and checkAndUnlockAchievements after completion', async () => {
    const instance = QUEST_INSTANCE({ mode_id: 3 });
    mockSuccessfulTransaction(instance, {
      totalXp: 100, newLevel: 1, oldLevel: 1, leveledUp: false,
    });

    await request(buildApp())
      .post('/api/quests/1/complete')
      .expect(200);

    expect(mockUpdateStreak).toHaveBeenCalledWith(42, 3);
    expect(mockCheckAchievements).toHaveBeenCalledWith(42);
  });

  it('should prevent double-completion via SELECT FOR UPDATE (second request sees completed)', async () => {
    // First request succeeds
    mockSuccessfulTransaction(QUEST_INSTANCE(), {
      totalXp: 100, newLevel: 1, oldLevel: 1, leveledUp: false,
    });

    const app = buildApp();
    await request(app).post('/api/quests/1/complete').expect(200);

    // Second request sees quest already completed (simulates row lock releasing after first commit)
    db.transaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({
          rows: [QUEST_INSTANCE({ status: 'completed' })],
        }),
      };
      return fn(mockClient);
    });

    const res = await request(app)
      .post('/api/quests/1/complete')
      .expect(400);

    expect(res.body.error).toContain('already completed');
  });
});
