/**
 * HTTP integration tests for user routes (bot/src/api/routes/users.ts)
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
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { userRouter } from '../../../api/routes/users.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/users', userRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/users/:telegramId/stats', () => {
  it('should return 200 with user stats when user exists', async () => {
    // resolveUser uses queryOne
    mockQueryOne
      .mockResolvedValueOnce({
        id: 1,
        telegram_id: 111,
        username: 'alice',
        first_name: 'Alice',
        current_level: 3,
        total_xp: 1200,
        is_active: true,
        timezone: 'UTC',
        created_at: '2025-01-01',
        current_streak: 5,
        longest_streak: 10,
        total_quests_completed: 42,
      });

    // Promise.all: [modes, activeQuests, aggregates, modeStreaks]
    mockQuery
      .mockResolvedValueOnce([])   // modes
      .mockResolvedValueOnce([])   // activeQuests
      .mockResolvedValueOnce([]);  // modeStreaks
    mockQueryOne
      .mockResolvedValueOnce({ completed_today: 2, xp_today: 50, days_active: 30 }); // aggregates

    // recentAchievementsRows
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.streakData.current).toBe(5);
    expect(res.body.data.completedQuestsToday).toBe(2);
  });

  it('should return 404 when user does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/users/999/stats')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/users', () => {
  it('should return 201 when creating a new user', async () => {
    mockQueryOne.mockResolvedValueOnce({
      id: 1,
      telegram_id: 111,
      username: 'bob',
      first_name: 'Bob',
    });

    const res = await request(buildApp())
      .post('/api/users')
      .send({ telegramId: 111, firstName: 'Bob', username: 'bob' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('User created successfully');
    expect(res.body.data.user.first_name).toBe('Bob');
  });

  it('should return 400 when telegramId is missing', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .send({ firstName: 'Bob' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('telegramId');
  });

  it('should return 400 when firstName is missing', async () => {
    const res = await request(buildApp())
      .post('/api/users')
      .send({ telegramId: 111 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('firstName');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('constraint violation'));

    const res = await request(buildApp())
      .post('/api/users')
      .send({ telegramId: 111, firstName: 'Bob' })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('PATCH /api/users/:telegramId/preferences', () => {
  it('should return 200 when updating notification preferences', async () => {
    mockQueryOne.mockResolvedValueOnce({
      notification_enabled: false,
      reminder_time: 14,
      timezone: 'UTC',
    });

    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ notification_enabled: false, reminder_time: 14 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notification_enabled).toBe(false);
    expect(res.body.data.reminder_time).toBe(14);
  });

  it('should return 400 for invalid telegram ID', async () => {
    const res = await request(buildApp())
      .patch('/api/users/abc/preferences')
      .send({ notification_enabled: true })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should return 400 when notification_enabled is not a boolean', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ notification_enabled: 'yes' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('No valid fields to update');
  });

  it('should return 404 when user does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/users/999/preferences')
      .send({ timezone: 'America/New_York' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });
});
