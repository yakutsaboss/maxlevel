/**
 * HTTP integration tests for leaderboard avatar_id (Run 57).
 *
 * Verifies that all leaderboard endpoints include avatar_id in their responses
 * after Agent E's changes to leaderboard.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

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

// ─── Import router after mocks ─────────────────────────────────────

import { leaderboardRouter } from '../../../api/routes/leaderboard.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/leaderboard', leaderboardRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('Leaderboard avatar_id — GET /api/leaderboard', () => {
  const sampleEntryWithAvatar = {
    user_id: 1,
    telegram_id: 111,
    username: 'alice',
    first_name: 'Alice',
    current_level: 5,
    total_xp: 2500,
    avatar_id: 3,
    best_current_streak: '7',
    total_quests_completed: '42',
    xp_rank: '1',
    level_rank: '1',
  };

  const sampleEntryNoAvatar = {
    user_id: 2,
    telegram_id: 222,
    username: 'bob',
    first_name: 'Bob',
    current_level: 3,
    total_xp: 1200,
    avatar_id: null,
    best_current_streak: '2',
    total_quests_completed: '10',
    xp_rank: '2',
    level_rank: '2',
  };

  it('should include avatar_id in cross-mode leaderboard response', async () => {
    db.query.mockResolvedValueOnce([sampleEntryWithAvatar]);

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toHaveProperty('avatar_id');
    expect(res.body.data[0].avatar_id).toBe(3);
  });

  it('should return null avatar_id when user has no avatar', async () => {
    db.query.mockResolvedValueOnce([sampleEntryNoAvatar]);

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0].avatar_id).toBeNull();
  });

  it('should include avatar_id for multiple users', async () => {
    db.query.mockResolvedValueOnce([sampleEntryWithAvatar, sampleEntryNoAvatar]);

    const res = await request(buildApp())
      .get('/api/leaderboard')
      .expect(200);

    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].avatar_id).toBe(3);
    expect(res.body.data[1].avatar_id).toBeNull();
  });
});

describe('Leaderboard avatar_id — GET /api/leaderboard?mode=fitness', () => {
  it('should include avatar_id in mode-filtered leaderboard', async () => {
    db.query.mockResolvedValueOnce([{
      user_id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice',
      current_level: 5,
      total_xp: 2500,
      avatar_id: 2,
      mode_streak: 3,
      mode_xp: 800,
      mode_quests_completed: 15,
      xp_rank: '1',
    }]);

    const res = await request(buildApp())
      .get('/api/leaderboard?mode=fitness')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('fitness');
    expect(res.body.data[0]).toHaveProperty('avatar_id');
    expect(res.body.data[0].avatar_id).toBe(2);
  });
});

describe('Leaderboard avatar_id — GET /api/leaderboard/weekly', () => {
  it('should include avatar_id in weekly leaderboard', async () => {
    db.query.mockResolvedValueOnce([{
      user_id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice',
      current_level: 5,
      total_xp: 2500,
      avatar_id: 4,
      weekly_xp: 300,
    }]);

    const res = await request(buildApp())
      .get('/api/leaderboard/weekly')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0]).toHaveProperty('avatar_id');
    expect(res.body.data[0].avatar_id).toBe(4);
    expect(res.body.data[0].weekly_xp).toBe(300);
  });
});

describe('Leaderboard avatar_id — GET /api/leaderboard/monthly', () => {
  it('should include avatar_id in monthly leaderboard', async () => {
    db.query.mockResolvedValueOnce([{
      user_id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice',
      current_level: 5,
      total_xp: 2500,
      avatar_id: 1,
      monthly_xp: 1200,
    }]);

    const res = await request(buildApp())
      .get('/api/leaderboard/monthly')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data[0]).toHaveProperty('avatar_id');
    expect(res.body.data[0].avatar_id).toBe(1);
    expect(res.body.data[0].monthly_xp).toBe(1200);
  });
});
