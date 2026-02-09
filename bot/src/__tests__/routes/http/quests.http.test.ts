/**
 * HTTP integration tests for quest routes (bot/src/api/routes/quests.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
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

const mockExecutePythonTool = vi.fn();
vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { questRouter } from '../../../api/routes/quests.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/quests', questRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/quests/users/:userId/active', () => {
  it('should return 200 with active quests', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {
        quests: [
          { id: 1, title: 'Morning Run', status: 'in_progress' },
          { id: 2, title: 'Drink Water', status: 'pending' },
        ],
        count: 2,
      },
    });

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(200);

    expect(res.body.quests).toHaveLength(2);
    expect(res.body.count).toBe(2);
    expect(mockExecutePythonTool).toHaveBeenCalledWith('quest_manager', ['--get-active', '--user-id', '42']);
  });

  it('should return empty array when no active quests', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { quests: [], count: 0 },
    });

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(200);

    expect(res.body.quests).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  it('should return 500 when python tool fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false, error: 'DB error' });

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });

  it('should return 500 when exception is thrown', async () => {
    mockExecutePythonTool.mockRejectedValueOnce(new Error('connection refused'));

    const res = await request(buildApp())
      .get('/api/quests/users/42/active')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('GET /api/quests/users/:userId/completed', () => {
  it('should return 200 with completed quests', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {
        quests: [{ id: 3, title: 'Read 30min', status: 'completed' }],
        count: 1,
      },
    });

    const res = await request(buildApp())
      .get('/api/quests/users/42/completed')
      .expect(200);

    expect(res.body.quests).toHaveLength(1);
    expect(res.body.count).toBe(1);
  });

  it('should pass limit query parameter', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { quests: [], count: 0 },
    });

    await request(buildApp())
      .get('/api/quests/users/42/completed?limit=10')
      .expect(200);

    expect(mockExecutePythonTool).toHaveBeenCalledWith('quest_manager', [
      '--get-completed', '--user-id', '42', '--limit', '10',
    ]);
  });
});

describe('POST /api/quests/:questId/complete', () => {
  it('should return 200 with XP and level data on success', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { xp_awarded: 50, new_level: 3 },
    });

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(200);

    expect(res.body.message).toBe('Quest completed successfully');
    expect(res.body.xpEarned).toBe(50);
    expect(res.body.newLevel).toBe(3);
    expect(res.body.leveledUp).toBe(true);
  });

  it('should return 404 when quest not found', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      data: { error: 'Quest not found' },
    });

    const res = await request(buildApp())
      .post('/api/quests/999/complete')
      .expect(404);

    expect(res.body.error).toBe('Not Found');
  });

  it('should return 400 when quest already completed', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      data: { error: 'Quest already completed' },
    });

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
  });

  it('should return 500 when tool fails with unknown error', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Internal failure',
    });

    const res = await request(buildApp())
      .post('/api/quests/7/complete')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('POST /api/quests/users/:userId/assign', () => {
  it('should return 200 when assigning daily quests', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { count: 3, quests: [{ id: 1 }, { id: 2 }, { id: 3 }] },
    });

    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({ frequency: 'daily' })
      .expect(200);

    expect(res.body.message).toContain('3');
    expect(res.body.message).toContain('daily');
    expect(res.body.quests).toHaveLength(3);
  });

  it('should return 400 when frequency is missing', async () => {
    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('frequency');
  });

  it('should return 400 when frequency is invalid', async () => {
    const res = await request(buildApp())
      .post('/api/quests/users/42/assign')
      .send({ frequency: 'monthly' })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
  });
});

describe('PATCH /api/quests/:questId/progress', () => {
  it('should return 200 with updated progress', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 5, user_id: 10, status: 'in_progress',
      current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
    });
    mockQueryOne.mockResolvedValueOnce({ id: 5 }); // UPDATE result

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 0 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('in_progress');
    expect(res.body.data.leveledUp).toBe(false);
  });

  it('should auto-complete when progress reaches target', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 5, user_id: 10, status: 'in_progress',
      current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
    });
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({}) // UPDATE quest_instances
          .mockResolvedValueOnce({ rows: [{ total_xp: 500, current_level: 3 }] }), // UPDATE users
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

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toBe('Invalid quest ID');
  });

  it('should return 400 when user_id is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ progress: 1 })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('user_id');
  });

  it('should return 400 when progress is negative', async () => {
    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: -1 })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('progress');
  });

  it('should return 404 when quest not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/quests/999/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(404);

    expect(res.body.error).toBe('Not Found');
  });

  it('should return 403 when quest belongs to another user', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 5, user_id: 99, status: 'in_progress',
      current_progress: 0, xp_reward: 100, title: 'Walk', target: 1,
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(403);

    expect(res.body.error).toBe('Forbidden');
  });

  it('should return 400 when quest is already completed', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 5, user_id: 10, status: 'completed',
      current_progress: 1, xp_reward: 100, title: 'Walk', target: 1,
    });

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('already completed');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .patch('/api/quests/5/progress')
      .send({ user_id: 10, progress: 1 })
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});
