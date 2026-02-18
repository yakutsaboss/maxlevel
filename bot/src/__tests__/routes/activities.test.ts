/**
 * Tests for activity API routes (bot/src/api/routes/activities.ts)
 *
 * Mocks: db (query, queryOne, execute), cache, auth middleware, rate limiter
 * Tests all 7 endpoints: start, stop, log, types, history, stats, delete
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../helpers/testApp.js';
import { getMockDb } from '../helpers/httpMocks.js';

// ─── Mocks (hoisted) ──────────────────────────────────────────────

vi.mock('../../utils/db.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../utils/cache.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../api/middleware/auth.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../api/middleware/rateLimiter.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockRateLimiters().module);

vi.mock('../../utils/validation.js', () => ({
  safeParseInt: (val: unknown, fallback: number) => {
    const n = parseInt(String(val), 10);
    return Number.isNaN(n) ? fallback : n;
  },
}));

// ─── Import router after mocks ────────────────────────────────────

import { activityRouter } from '../../api/routes/activities.js';

const db = getMockDb();

// ─── Build test app ───────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  // Simulate telegramUser being set by auth middleware
  app.use((req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  });
  app.use('/api/activities', activityRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test Data ────────────────────────────────────────────────────

const TEST_USER = { id: 1, telegram_id: 111 };
const TEST_ACTIVITY_TYPE = {
  id: 5,
  name: 'Running',
  category: 'Cardio',
  icon_emoji: '🏃',
  description: 'Go for a run',
  default_duration_min: 30,
  calories_per_min: 10,
  requires_timer: true,
  requires_gps: false,
};

const TEST_ACTIVITY_LOG = {
  id: 42,
  user_id: 1,
  activity_type_id: 5,
  started_at: '2026-02-18T10:00:00Z',
  ended_at: '2026-02-18T10:30:00Z',
  duration_min: 30,
  distance_km: null,
  calories_burned: 300,
  notes: null,
  created_at: '2026-02-18T10:00:00Z',
};

// ─── Tests ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ═════════════════════════════════════════════════════════════════
//  POST /api/activities/start
// ═════════════════════════════════════════════════════════════════

describe('POST /api/activities/start', () => {
  it('should start a timer activity and return 201', async () => {
    // resolveUserId
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    // verify activity type
    db.queryOne.mockResolvedValueOnce({ id: 5, name: 'Running' });
    // check no running timer
    db.queryOne.mockResolvedValueOnce(null);
    // insert log
    db.queryOne.mockResolvedValueOnce({ ...TEST_ACTIVITY_LOG, ended_at: null });

    const res = await request(buildApp())
      .post('/api/activities/start')
      .send({ telegram_id: 111, activity_type_id: 5 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should return 400 when activity already running', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce({ id: 5, name: 'Running' }); // activity type
    db.queryOne.mockResolvedValueOnce({ id: 99 }); // running timer exists

    const res = await request(buildApp())
      .post('/api/activities/start')
      .send({ telegram_id: 111, activity_type_id: 5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 when activity type not found', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce(null); // activity type not found

    const res = await request(buildApp())
      .post('/api/activities/start')
      .send({ telegram_id: 111, activity_type_id: 999 });

    expect(res.status).toBe(404);
  });

  it('should return error when missing required params', async () => {
    const res = await request(buildApp())
      .post('/api/activities/start')
      .send({ telegram_id: 111 }); // missing activity_type_id

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════
//  POST /api/activities/stop
// ═════════════════════════════════════════════════════════════════

describe('POST /api/activities/stop', () => {
  it('should stop a running timer and return duration + calories', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    // running log with calories_per_min
    db.queryOne.mockResolvedValueOnce({
      id: 42,
      user_id: 1,
      activity_type_id: 5,
      started_at: new Date(Date.now() - 30 * 60000).toISOString(), // 30 min ago
      ended_at: null,
      calories_per_min: 10,
    });
    // update return
    db.queryOne.mockResolvedValueOnce({
      ...TEST_ACTIVITY_LOG,
      duration_min: 30,
      calories_burned: 300,
    });

    const res = await request(buildApp())
      .post('/api/activities/stop')
      .send({ telegram_id: 111, activity_log_id: 42 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.duration_min).toBeGreaterThan(0);
    expect(res.body.data.calories_burned).toBeGreaterThan(0);
  });

  it('should return 404 when activity log not found', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce(null); // log not found

    const res = await request(buildApp())
      .post('/api/activities/stop')
      .send({ telegram_id: 111, activity_log_id: 999 });

    expect(res.status).toBe(404);
  });

  it('should return 400 when activity already stopped', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce({
      id: 42,
      user_id: 1,
      activity_type_id: 5,
      started_at: '2026-02-18T10:00:00Z',
      ended_at: '2026-02-18T10:30:00Z', // already ended
      calories_per_min: 10,
    });

    const res = await request(buildApp())
      .post('/api/activities/stop')
      .send({ telegram_id: 111, activity_log_id: 42 });

    expect(res.status).toBe(400);
  });
});

// ═════════════════════════════════════════════════════════════════
//  POST /api/activities/log
// ═════════════════════════════════════════════════════════════════

describe('POST /api/activities/log', () => {
  it('should create a quick log and return 201', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce({ id: 5, calories_per_min: 10 }); // activity type
    db.queryOne.mockResolvedValueOnce(TEST_ACTIVITY_LOG); // insert

    const res = await request(buildApp())
      .post('/api/activities/log')
      .send({ telegram_id: 111, activity_type_id: 5, duration_min: 30 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when duration_min is 0 or negative', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId

    const res = await request(buildApp())
      .post('/api/activities/log')
      .send({ telegram_id: 111, activity_type_id: 5, duration_min: 0 });

    expect(res.status).toBe(400);
  });

  it('should return 404 when activity type not found', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce(null); // activity type not found

    const res = await request(buildApp())
      .post('/api/activities/log')
      .send({ telegram_id: 111, activity_type_id: 999, duration_min: 30 });

    expect(res.status).toBe(404);
  });

  it('should handle missing required params', async () => {
    const res = await request(buildApp())
      .post('/api/activities/log')
      .send({ telegram_id: 111 }); // missing activity_type_id and duration_min

    expect(res.status).toBe(400);
  });

  it('should calculate calories from calories_per_min', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // resolveUserId
    db.queryOne.mockResolvedValueOnce({ id: 5, calories_per_min: 8 }); // 8 cal/min
    db.queryOne.mockResolvedValueOnce({
      ...TEST_ACTIVITY_LOG,
      calories_burned: 160, // 8 * 20
    });

    const res = await request(buildApp())
      .post('/api/activities/log')
      .send({ telegram_id: 111, activity_type_id: 5, duration_min: 20 });

    expect(res.status).toBe(201);
    expect(res.body.data.calories_burned).toBe(160);
  });
});

// ═════════════════════════════════════════════════════════════════
//  GET /api/activities/types
// ═════════════════════════════════════════════════════════════════

describe('GET /api/activities/types', () => {
  it('should return all activity types grouped by category', async () => {
    db.query.mockResolvedValueOnce([
      { ...TEST_ACTIVITY_TYPE, category: 'Cardio', name: 'Running' },
      { ...TEST_ACTIVITY_TYPE, id: 6, category: 'Cardio', name: 'Cycling' },
      { ...TEST_ACTIVITY_TYPE, id: 7, category: 'Strength', name: 'Push-ups' },
    ]);

    const res = await request(buildApp())
      .get('/api/activities/types');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    // The route groups by category
    expect(res.body.data.Cardio).toBeDefined();
    expect(res.body.data.Cardio).toHaveLength(2);
    expect(res.body.data.Strength).toHaveLength(1);
  });

  it('should return empty object when no types exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/activities/types');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual({});
  });
});

// ═════════════════════════════════════════════════════════════════
//  GET /api/activities/:userId/history
// ═════════════════════════════════════════════════════════════════

describe('GET /api/activities/:userId/history', () => {
  it('should return paginated activity history', async () => {
    db.query.mockResolvedValueOnce([
      { ...TEST_ACTIVITY_LOG, activity_name: 'Running', category: 'Cardio', icon_emoji: '🏃' },
    ]);
    db.queryOne.mockResolvedValueOnce({ total: '1' });

    const res = await request(buildApp())
      .get('/api/activities/1/history');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.activities).toHaveLength(1);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.totalPages).toBe(1);
  });

  it('should support pagination params', async () => {
    db.query.mockResolvedValueOnce([]);
    db.queryOne.mockResolvedValueOnce({ total: '50' });

    const res = await request(buildApp())
      .get('/api/activities/1/history?page=3&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(3);
    expect(res.body.data.limit).toBe(10);
    expect(res.body.data.totalPages).toBe(5);
  });

  it('should filter by category', async () => {
    db.query.mockResolvedValueOnce([]);
    db.queryOne.mockResolvedValueOnce({ total: '0' });

    const res = await request(buildApp())
      .get('/api/activities/1/history?category=Cardio');

    expect(res.status).toBe(200);
    // Category filter was applied (verified by checking query was called with category param)
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('at.category'),
      expect.arrayContaining(['Cardio']),
    );
  });

  it('should filter by date range', async () => {
    db.query.mockResolvedValueOnce([]);
    db.queryOne.mockResolvedValueOnce({ total: '0' });

    const res = await request(buildApp())
      .get('/api/activities/1/history?from=2026-02-01&to=2026-02-28');

    expect(res.status).toBe(200);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('started_at'),
      expect.arrayContaining(['2026-02-01', '2026-02-28']),
    );
  });

  it('should return empty activities when none exist', async () => {
    db.query.mockResolvedValueOnce([]);
    db.queryOne.mockResolvedValueOnce({ total: '0' });

    const res = await request(buildApp())
      .get('/api/activities/1/history');

    expect(res.status).toBe(200);
    expect(res.body.data.activities).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
//  GET /api/activities/:userId/stats
// ═════════════════════════════════════════════════════════════════

describe('GET /api/activities/:userId/stats', () => {
  it('should return activity statistics', async () => {
    // aggregates
    db.queryOne.mockResolvedValueOnce({
      total_activities: '15',
      total_duration_min: '450',
      total_calories: '3000',
    });
    // favorite
    db.queryOne.mockResolvedValueOnce({
      activity_name: 'Running',
      icon_emoji: '🏃',
      count: '8',
    });
    // streak dates
    db.query.mockResolvedValueOnce([
      { activity_date: new Date().toISOString().slice(0, 10) },
      { activity_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10) },
    ]);

    const res = await request(buildApp())
      .get('/api/activities/1/stats');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.total_activities).toBe(15);
    expect(res.body.data.total_duration_min).toBe(450);
    expect(res.body.data.total_calories).toBe(3000);
    expect(res.body.data.favorite_activity).toEqual({
      name: 'Running',
      icon_emoji: '🏃',
      count: 8,
    });
    expect(res.body.data.current_streak).toBeGreaterThanOrEqual(1);
  });

  it('should return zeros when no activities exist', async () => {
    db.queryOne.mockResolvedValueOnce({
      total_activities: '0',
      total_duration_min: '0',
      total_calories: '0',
    });
    db.queryOne.mockResolvedValueOnce(null); // no favorite
    db.query.mockResolvedValueOnce([]); // no streak dates

    const res = await request(buildApp())
      .get('/api/activities/1/stats');

    expect(res.status).toBe(200);
    expect(res.body.data.total_activities).toBe(0);
    expect(res.body.data.favorite_activity).toBeNull();
    expect(res.body.data.current_streak).toBe(0);
    expect(res.body.data.longest_streak).toBe(0);
  });
});

// ═════════════════════════════════════════════════════════════════
//  DELETE /api/activities/:logId
// ═════════════════════════════════════════════════════════════════

describe('DELETE /api/activities/:logId', () => {
  it('should delete an activity log', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 42, user_id: 1 }); // find log
    db.execute.mockResolvedValueOnce(1); // delete

    const res = await request(buildApp())
      .delete('/api/activities/42');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deleted).toBe(true);
  });

  it('should return 404 when log not found', async () => {
    db.queryOne.mockResolvedValueOnce(null); // log not found

    const res = await request(buildApp())
      .delete('/api/activities/999');

    expect(res.status).toBe(404);
  });

  it('should return 400 for invalid log ID', async () => {
    const res = await request(buildApp())
      .delete('/api/activities/abc');

    expect(res.status).toBe(400);
  });
});
