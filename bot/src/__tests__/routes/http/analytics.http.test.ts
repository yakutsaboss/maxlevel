/**
 * HTTP integration tests for analytics routes (bot/src/api/routes/analytics.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 * Covers 3 endpoints: modes list, mode detail, and summary.
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

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router + mock refs after mocks ──────────────────────────

import { analyticsRouter } from '../../../api/routes/analytics.js';

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/analytics', analyticsRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /:userId/modes ──────────────────────────────────────────────

describe('GET /api/analytics/:userId/modes', () => {
  it('should return 200 with per-mode analytics', async () => {
    db.query.mockResolvedValueOnce([
      {
        mode_id: 1,
        mode_name: 'fitness',
        display_name: 'Fitness',
        icon_emoji: '💪',
        total_quests: 10,
        completed_quests: 7,
        total_xp_earned: 350,
        current_streak: 3,
        longest_streak: 10,
      },
    ]);

    const res = await request(buildApp())
      .get('/api/analytics/1/modes')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].mode_name).toBe('fitness');
    expect(res.body.data[0].completion_rate).toBe(70);
    expect(res.body.data[0].xp_earned).toBe(350);
    expect(res.body.data[0].streak.current).toBe(3);
    expect(res.body.data[0].streak.longest).toBe(10);
  });

  it('should return 200 with empty array when no modes', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/analytics/1/modes')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });

  it('should return 400 for invalid userId (NaN)', async () => {
    const res = await request(buildApp())
      .get('/api/analytics/abc/modes')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid userId');
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/analytics/1/modes')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── GET /:userId/modes/:mode ────────────────────────────────────────

describe('GET /api/analytics/:userId/modes/:mode', () => {
  it('should return 200 with detailed mode analytics', async () => {
    // queryOne for mode lookup
    db.queryOne.mockResolvedValueOnce({
      id: 1,
      name: 'fitness',
      display_name: 'Fitness',
      icon_emoji: '💪',
    });

    // query for quest history
    db.query.mockResolvedValueOnce([
      {
        quest_instance_id: 10,
        title: 'Morning Run',
        quest_type: 'daily',
        difficulty: 'medium',
        status: 'completed',
        xp_awarded: 50,
        instance_date: '2026-02-10',
        completed_at: '2026-02-10T08:00:00Z',
        check_in_count: 1,
        target: 1,
      },
    ]);
    // queryOne for streak data
    db.queryOne.mockResolvedValueOnce({
      current_streak: 5,
      longest_streak: 12,
      last_activity_date: '2026-02-10',
    });
    // query for weekly XP
    db.query.mockResolvedValueOnce([
      { day: '2026-02-10', xp: 50 },
    ]);

    const res = await request(buildApp())
      .get('/api/analytics/1/modes/fitness')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.mode.name).toBe('fitness');
    expect(res.body.data.progress.completion_rate).toBe(100);
    expect(res.body.data.progress.completed_quests).toBe(1);
    expect(res.body.data.streak.current).toBe(5);
    expect(res.body.data.streak.longest).toBe(12);
    expect(res.body.data.weekly_xp).toHaveLength(1);
    expect(res.body.data.quest_history).toHaveLength(1);
    expect(res.body.data.quest_history[0].title).toBe('Morning Run');
  });

  it('should return 404 when mode not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/analytics/1/modes/nonexistent')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain("Mode 'nonexistent' not found");
  });

  it('should return 400 for invalid userId (NaN)', async () => {
    const res = await request(buildApp())
      .get('/api/analytics/abc/modes/fitness')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid userId');
  });
});

// ─── GET /:userId/summary ─────────────────────────────────────────────

describe('GET /api/analytics/:userId/summary', () => {
  it('should return 200 with progress summary', async () => {
    db.queryOne.mockResolvedValueOnce({
      total_xp: 2500,
      current_level: 5,
      quests_completed: 40,
      quests_total: 50,
      active_modes: 3,
      active_streaks: 2,
      best_streak: 15,
      days_active: 30,
      xp_this_week: 350,
    });

    const res = await request(buildApp())
      .get('/api/analytics/1/summary')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total_xp).toBe(2500);
    expect(res.body.data.level).toBe(5);
    expect(res.body.data.quests_completed).toBe(40);
    expect(res.body.data.completion_rate).toBe(80);
    expect(res.body.data.active_modes).toBe(3);
    expect(res.body.data.best_streak).toBe(15);
    expect(res.body.data.xp_this_week).toBe(350);
  });

  it('should return 404 when user not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/analytics/1/summary')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('User not found');
  });

  it('should return 400 for invalid userId (NaN)', async () => {
    const res = await request(buildApp())
      .get('/api/analytics/abc/summary')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid userId');
  });
});
