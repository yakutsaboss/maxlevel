/**
 * HTTP integration tests for check-in routes (bot/src/api/routes/checkins.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

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

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: vi.fn(),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { checkinRouter } from '../../../api/routes/checkins.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/checkins', checkinRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/checkins', () => {
  it('should return 200 and create a check-in with progress', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 10,
      user_id: 1,
      status: 'in_progress',
      check_in_count: 0,
      xp_reward: 50,
      title: 'Morning Run',
      target: 1,
    });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1, check_in_time: '2026-02-10T08:00:00Z' }] }) // INSERT check_in
          .mockResolvedValueOnce({ rows: [] }) // UPDATE quest_instances (completed)
          .mockResolvedValueOnce({ rows: [{ total_xp: 550, current_level: 2 }] }), // UPDATE users
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111', quest_instance_id: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.check_in_id).toBe(1);
    expect(res.body.data.quest_progress.current).toBe(1);
    expect(res.body.data.quest_progress.target).toBe(1);
    expect(res.body.data.completed).toBe(true);
  });

  it('should increment progress without completing when target not reached', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 10,
      user_id: 1,
      status: 'in_progress',
      check_in_count: 1,
      xp_reward: 50,
      title: 'Study',
      target: 5,
    });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 2, check_in_time: '2026-02-10T09:00:00Z' }] }) // INSERT
          .mockResolvedValueOnce({ rows: [] }), // UPDATE check_in_count
      };
      return fn(mockClient);
    });

    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111', quest_instance_id: 10 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.check_in_id).toBe(2);
    expect(res.body.data.quest_progress.current).toBe(2);
    expect(res.body.data.quest_progress.target).toBe(5);
    expect(res.body.data.completed).toBe(false);
  });

  it('should return 400 for already completed quest', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 10,
      user_id: 1,
      status: 'completed',
      check_in_count: 1,
      xp_reward: 50,
      title: 'Done Quest',
      target: 1,
    });

    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111', quest_instance_id: 10 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('already completed');
  });

  it('should return 404 for non-existent quest_instance', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111', quest_instance_id: 999 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('should return 400 when telegram_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ quest_instance_id: 10 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('telegram_id');
  });

  it('should return 400 when quest_instance_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('quest_instance_id');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/checkins')
      .send({ telegram_id: '111', quest_instance_id: 10 })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/checkins/:telegramId/today', () => {
  it('should return 200 with today\'s check-ins', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, check_in_time: '2026-02-10T08:00:00Z', notes: null, is_valid: true, quest_title: 'Morning Run', quest_status: 'completed' },
      { id: 2, check_in_time: '2026-02-10T09:00:00Z', notes: 'Good session', is_valid: true, quest_title: 'Study', quest_status: 'in_progress' },
    ]);

    const res = await request(buildApp())
      .get('/api/checkins/111/today')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.check_ins).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.check_ins[0].quest_title).toBe('Morning Run');
  });

  it('should return empty array when no check-ins today', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/checkins/111/today')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.check_ins).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 400 for invalid telegram ID', async () => {
    const res = await request(buildApp())
      .get('/api/checkins/abc/today')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid telegram ID');
  });
});

describe('GET /api/checkins/:telegramId/history', () => {
  it('should return 200 with paginated history', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 3, check_in_time: '2026-02-10T10:00:00Z', notes: null, is_valid: true, quest_title: 'Read', quest_status: 'completed' },
    ]);

    const res = await request(buildApp())
      .get('/api/checkins/111/history?page=1&limit=10')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.check_ins).toHaveLength(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(10);
  });

  it('should default to page=1 limit=20', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/checkins/111/history')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.limit).toBe(20);
  });

  it('should return 400 for invalid telegram ID', async () => {
    const res = await request(buildApp())
      .get('/api/checkins/abc/history')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid telegram ID');
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/checkins/111/history')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
