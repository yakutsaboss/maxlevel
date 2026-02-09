/**
 * HTTP integration tests for leaderboard routes (bot/src/api/routes/leaderboard.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockQuery = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
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

import { leaderboardRouter } from '../../../api/routes/leaderboard.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/leaderboard', leaderboardRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/leaderboard', () => {
  const sampleEntry = {
    user_id: 1,
    telegram_id: 111,
    username: 'alice',
    first_name: 'Alice',
    current_level: 5,
    total_xp: 2500,
    best_current_streak: '7',
    total_quests_completed: '42',
    xp_rank: '1',
    level_rank: '1',
  };

  it('should return 200 with cross-mode top 50 leaderboard', async () => {
    mockQuery.mockResolvedValueOnce([sampleEntry]);

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].username).toBe('alice');
    expect(res.body.data[0].xp_rank).toBe(1);
    expect(res.body.data[0].level_rank).toBe(1);
    expect(res.body.data[0].current_streak).toBe(7);
    expect(res.body.data[0].total_quests_completed).toBe(42);
  });

  it('should return empty array when no active users', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should respect limit query parameter', async () => {
    mockQuery.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/leaderboard?limit=10')
      .expect(200);

    // The query should have been called with limit=10
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      [10],
    );
  });

  it('should cap limit at 100', async () => {
    mockQuery.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/leaderboard?limit=500')
      .expect(200);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      [100],
    );
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection timeout'));

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('leaderboard');
  });
});

describe('GET /api/leaderboard?mode=fitness', () => {
  const modeSampleEntry = {
    user_id: 1,
    telegram_id: 111,
    username: 'alice',
    first_name: 'Alice',
    current_level: 5,
    total_xp: 2500,
    mode_streak: 3,
    mode_xp: 800,
    mode_quests_completed: 15,
    xp_rank: '1',
  };

  it('should return 200 with mode-specific leaderboard', async () => {
    mockQuery.mockResolvedValueOnce([modeSampleEntry]);

    const res = await request(buildApp())
      .get('/api/leaderboard?mode=fitness')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('fitness');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].mode_xp).toBe(800);
    expect(res.body.data[0].mode_streak).toBe(3);
    expect(res.body.data[0].mode_quests_completed).toBe(15);
  });

  it('should return empty list for nonexistent mode', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/leaderboard?mode=nonexistent')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('nonexistent');
    expect(res.body.data).toHaveLength(0);
  });

  it('should pass mode to the SQL query', async () => {
    mockQuery.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/leaderboard?mode=hydration')
      .expect(200);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('m.name'),
      [50, 'hydration'],
    );
  });
});

describe('GET /api/leaderboard/weekly', () => {
  it('should return 200 with weekly rankings', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        user_id: 1,
        telegram_id: 111,
        username: 'alice',
        first_name: 'Alice',
        current_level: 5,
        total_xp: 2500,
        weekly_xp: 300,
      },
    ]);

    const res = await request(buildApp())
      .get('/api/leaderboard/weekly')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].weekly_xp).toBe(300);
    expect(res.body.data[0].rank).toBe(1);
  });

  it('should return empty array when no weekly activity', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/leaderboard/weekly')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(buildApp())
      .get('/api/leaderboard/weekly')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('weekly');
  });
});
