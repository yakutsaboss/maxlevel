/**
 * HTTP integration tests for trophy routes (bot/src/api/routes/trophies.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 67 Agent E: Tests for GET /trophies, GET /trophies/:userId, GET /trophies/:userId/check
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb, getMockCache } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { trophyRouter } from '../../../api/routes/trophies.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/trophies', trophyRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ──────────────────────────────────────────────────────

const mockTrophies = [
  { id: 1, name: 'First Steps', description: 'Complete 1 quest', icon_emoji: '🏆', rarity: 'common', criteria: { type: 'quest_count', threshold: 1 }, sort_order: 1, created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Getting Started', description: 'Reach level 2', icon_emoji: '🥇', rarity: 'common', criteria: { type: 'level', threshold: 2 }, sort_order: 2, created_at: '2026-01-01T00:00:00Z' },
  { id: 3, name: 'Social Debut', description: 'Add 1 friend', icon_emoji: '🌟', rarity: 'common', criteria: { type: 'friend_count', threshold: 1 }, sort_order: 3, created_at: '2026-01-01T00:00:00Z' },
  { id: 4, name: 'Week Warrior', description: '7-day streak', icon_emoji: '⚔️', rarity: 'rare', criteria: { type: 'streak_days', threshold: 7 }, sort_order: 4, created_at: '2026-01-01T00:00:00Z' },
  { id: 5, name: 'Streak Legend', description: '100-day streak', icon_emoji: '👑', rarity: 'legendary', criteria: { type: 'streak_days', threshold: 100 }, sort_order: 15, created_at: '2026-01-01T00:00:00Z' },
];

const mockUserTrophies = [
  { id: 1, user_id: 1, trophy_id: 1, earned_at: '2026-02-10T10:00:00Z', name: 'First Steps', description: 'Complete 1 quest', icon_emoji: '🏆', rarity: 'common' },
];

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/trophies ──────────────────────────────────────────────

describe('GET /api/trophies', () => {
  it('should return full trophy catalog', async () => {
    db.query.mockResolvedValueOnce(mockTrophies);

    const res = await request(buildApp())
      .get('/api/trophies')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.data[0].name).toBe('First Steps');
    expect(res.body.data[0].icon_emoji).toBe('🏆');
  });

  it('should return empty array when no trophies exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/trophies')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/trophies')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/trophies/:userId ──────────────────────────────────────

describe('GET /api/trophies/:userId', () => {
  it('should return earned trophies for a user', async () => {
    db.query.mockResolvedValueOnce(mockUserTrophies);

    const res = await request(buildApp())
      .get('/api/trophies/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('First Steps');
    expect(res.body.data[0]).toHaveProperty('earned_at');
  });

  it('should return empty array for user with no trophies', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/trophies/999')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should reject invalid (non-numeric) userId', async () => {
    const res = await request(buildApp())
      .get('/api/trophies/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/trophies/1')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/trophies/:userId/check ────────────────────────────────

describe('GET /api/trophies/:userId/check', () => {
  it('should award newly earned trophies and return them', async () => {
    // The check endpoint reads user stats, compares against criteria, awards new trophies
    const newlyAwarded = [
      { id: 2, name: 'Getting Started', icon_emoji: '🥇', rarity: 'common', earned_at: '2026-02-16T00:00:00Z' },
    ];
    db.query.mockResolvedValueOnce(newlyAwarded);

    const res = await request(buildApp())
      .get('/api/trophies/1/check')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('Getting Started');
  });

  it('should return empty array when no new trophies earned', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/trophies/1/check')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should reject invalid (non-numeric) userId', async () => {
    const res = await request(buildApp())
      .get('/api/trophies/abc/check')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/trophies/1/check')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});
