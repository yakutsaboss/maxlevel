/**
 * HTTP integration tests for punishment routes (bot/src/api/routes/punishment.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
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

import { punishmentRouter } from '../../../api/routes/punishment.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/punishment', punishmentRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /:telegramId/settings ─────────────────────────────────────

describe('GET /api/punishment/:telegramId/settings', () => {
  const sampleSettings = {
    consent_given: true,
    consent_timestamp: '2026-01-15T10:00:00.000Z',
    intensity_level: 'medium',
    safe_mode: true,
    custom_punishments: {},
    max_xp_penalty: 50,
    max_streak_reset: 3,
  };

  it('should return 200 with punishment settings', async () => {
    db.queryOne.mockResolvedValueOnce(sampleSettings);

    const res = await request(buildApp())
      .get('/api/punishment/123456/settings')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.consent_given).toBe(true);
    expect(res.body.data.intensity_level).toBe('medium');
    expect(res.body.data.safe_mode).toBe(true);
    expect(res.body.data.max_xp_penalty).toBe(50);
  });

  it('should return 404 when no settings found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/punishment/123456/settings')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No settings found');
  });

  it('should return 400 for invalid telegramId', async () => {
    const res = await request(buildApp())
      .get('/api/punishment/abc/settings')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('connection timeout'));

    const res = await request(buildApp())
      .get('/api/punishment/123456/settings')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── PATCH /:telegramId/settings ───────────────────────────────────

describe('PATCH /api/punishment/:telegramId/settings', () => {
  const dbUser = { id: 42 };
  const updatedSettings = {
    consent_given: true,
    consent_timestamp: '2026-01-15T10:00:00.000Z',
    intensity_level: 'high',
    safe_mode: false,
    custom_punishments: {},
    max_xp_penalty: 50,
    max_streak_reset: 3,
  };

  it('should return 200 when updating existing settings', async () => {
    // 1st queryOne: user lookup → found
    db.queryOne.mockResolvedValueOnce(dbUser);
    // 2nd queryOne: UPDATE RETURNING → success
    db.queryOne.mockResolvedValueOnce(updatedSettings);

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ intensity_level: 'high', safe_mode: false })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.intensity_level).toBe('high');
    expect(res.body.data.safe_mode).toBe(false);
  });

  it('should insert defaults when no existing row (UPDATE returns null)', async () => {
    const insertedSettings = {
      consent_given: false,
      consent_timestamp: null,
      intensity_level: 'medium',
      safe_mode: true,
      custom_punishments: {},
      max_xp_penalty: 50,
      max_streak_reset: 3,
    };

    // 1st queryOne: user lookup → found
    db.queryOne.mockResolvedValueOnce(dbUser);
    // 2nd queryOne: UPDATE RETURNING → null (no existing row)
    db.queryOne.mockResolvedValueOnce(null);
    // 3rd queryOne: INSERT RETURNING → new row
    db.queryOne.mockResolvedValueOnce(insertedSettings);

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ safe_mode: true })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.consent_given).toBe(false);
    expect(res.body.data.intensity_level).toBe('medium');
  });

  it('should return 400 for invalid intensity_level', async () => {
    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ intensity_level: 'nuclear' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid intensity level');
  });

  it('should accept all valid intensity levels', async () => {
    for (const level of ['low', 'medium', 'high', 'extreme']) {
      vi.resetAllMocks();
      db.queryOne.mockResolvedValueOnce(dbUser);
      db.queryOne.mockResolvedValueOnce({ ...updatedSettings, intensity_level: level });

      const res = await request(buildApp())
        .patch('/api/punishment/123456/settings')
        .send({ intensity_level: level })
        .expect(200);

      expect(res.body.data.intensity_level).toBe(level);
    }
  });

  it('should return 400 when no fields provided', async () => {
    // User lookup happens before field check in the route
    db.queryOne.mockResolvedValueOnce(dbUser);

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No fields to update');
  });

  it('should return 404 when user not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ safe_mode: true })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 400 for invalid telegramId', async () => {
    const res = await request(buildApp())
      .patch('/api/punishment/abc/settings')
      .send({ safe_mode: true })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should include consent_timestamp = NOW() when consent_given is true', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce(updatedSettings);

    await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ consent_given: true })
      .expect(200);

    // The UPDATE query should contain consent_timestamp = NOW()
    const updateCall = db.queryOne.mock.calls[1];
    expect(updateCall[0]).toContain('consent_timestamp = NOW()');
  });

  it('should set consent_timestamp = NULL when consent_given is false', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce(updatedSettings);

    await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ consent_given: false })
      .expect(200);

    const updateCall = db.queryOne.mock.calls[1];
    expect(updateCall[0]).toContain('consent_timestamp = NULL');
  });

  it('should handle custom_punishments as JSON', async () => {
    const customPunishments = ['no_sweets', 'extra_pushups'];
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ ...updatedSettings, custom_punishments: customPunishments });

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ custom_punishments: customPunishments })
      .expect(200);

    expect(res.body.data.custom_punishments).toEqual(customPunishments);
    // Verify JSON.stringify was passed to DB
    const updateCall = db.queryOne.mock.calls[1];
    expect(updateCall[1]).toContain(JSON.stringify(customPunishments));
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(buildApp())
      .patch('/api/punishment/123456/settings')
      .send({ safe_mode: true })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── GET /:telegramId/history ──────────────────────────────────────

describe('GET /api/punishment/:telegramId/history', () => {
  const dbUser = { id: 42 };

  const samplePunishment = {
    id: 1,
    quest_instance_id: 10,
    punishment_type: 'xp_deduction',
    severity: 'medium',
    xp_deducted: 25,
    streak_days_lost: 0,
    message_sent: 'You lost 25 XP!',
    applied_at: '2026-01-20T12:00:00.000Z',
    quest_title: 'Morning Run',
  };

  it('should return 200 with paginated punishment history', async () => {
    // 1st queryOne: user lookup
    db.queryOne.mockResolvedValueOnce(dbUser);
    // 2nd queryOne: COUNT
    db.queryOne.mockResolvedValueOnce({ total: 1 });
    // query: punishment rows
    db.query.mockResolvedValueOnce([samplePunishment]);

    const res = await request(buildApp())
      .get('/api/punishment/123456/history')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.punishments).toHaveLength(1);
    expect(res.body.data.punishments[0].punishment_type).toBe('xp_deduction');
    expect(res.body.data.punishments[0].quest_title).toBe('Morning Run');
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.total).toBe(1);
  });

  it('should return empty array when no punishment history', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ total: 0 });
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/punishment/123456/history')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.punishments).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('should respect page and limit query params', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ total: 50 });
    db.query.mockResolvedValueOnce([samplePunishment]);

    const res = await request(buildApp())
      .get('/api/punishment/123456/history?page=3&limit=5')
      .expect(200);

    expect(res.body.data.page).toBe(3);
    // Verify offset = (3-1)*5 = 10
    const queryCall = db.query.mock.calls[0];
    expect(queryCall[1]).toEqual([dbUser.id, 5, 10]);
  });

  it('should cap limit at 100', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ total: 200 });
    db.query.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/punishment/123456/history?limit=500')
      .expect(200);

    const queryCall = db.query.mock.calls[0];
    expect(queryCall[1][1]).toBe(100);
  });

  it('should default page=1 and limit=20 for invalid params', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ total: 0 });
    db.query.mockResolvedValueOnce([]);

    await request(buildApp())
      .get('/api/punishment/123456/history?page=abc&limit=xyz')
      .expect(200);

    const queryCall = db.query.mock.calls[0];
    // page defaults to 1 → offset = 0, limit defaults to 20
    expect(queryCall[1]).toEqual([dbUser.id, 20, 0]);
  });

  it('should clamp page to minimum 1', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce({ total: 0 });
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/punishment/123456/history?page=-5')
      .expect(200);

    expect(res.body.data.page).toBe(1);
  });

  it('should return 404 when user not found', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/punishment/123456/history')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 400 for invalid telegramId', async () => {
    const res = await request(buildApp())
      .get('/api/punishment/abc/history')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(buildApp())
      .get('/api/punishment/123456/history')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
