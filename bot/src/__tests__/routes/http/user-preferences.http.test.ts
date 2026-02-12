/**
 * HTTP integration tests for user preferences routes
 * (bot/src/api/routes/user-preferences.ts)
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

import { userRouter } from '../../../api/routes/users.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

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

describe('GET /api/users/:telegramId/preferences', () => {
  it('should return 200 with user preferences when user exists', async () => {
    db.queryOne.mockResolvedValueOnce({
      notification_enabled: true,
      reminder_time: 9,
      timezone: 'Europe/Moscow',
    });

    const res = await request(buildApp())
      .get('/api/users/111/preferences')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notification_enabled).toBe(true);
    expect(res.body.data.reminder_time).toBe(9);
    expect(res.body.data.timezone).toBe('Europe/Moscow');
  });

  it('should return defaults when fields are null', async () => {
    db.queryOne.mockResolvedValueOnce({
      notification_enabled: null,
      reminder_time: null,
      timezone: null,
    });

    const res = await request(buildApp())
      .get('/api/users/111/preferences')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notification_enabled).toBe(true);
    expect(res.body.data.reminder_time).toBe(9);
    expect(res.body.data.timezone).toBe('Europe/Moscow');
  });

  it('should return 400 for invalid telegram ID', async () => {
    const res = await request(buildApp())
      .get('/api/users/abc/preferences')
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/users/999/preferences')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });
});

describe('PATCH /api/users/:telegramId/preferences', () => {
  it('should return 200 when updating notification preferences', async () => {
    db.queryOne.mockResolvedValueOnce({
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

  it('should return 200 when updating timezone only', async () => {
    db.queryOne.mockResolvedValueOnce({
      notification_enabled: true,
      reminder_time: 9,
      timezone: 'America/New_York',
    });

    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ timezone: 'America/New_York' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.timezone).toBe('America/New_York');
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
    expect(res.body.error).toBe('notification_enabled must be a boolean');
  });

  it('should return 400 when reminder_time is out of range', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ reminder_time: 25 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('reminder_time must be an integer 0-23');
  });

  it('should return 400 when timezone is empty string', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ timezone: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('timezone must be a non-empty string');
  });

  it('should return 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No valid fields to update');
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/users/999/preferences')
      .send({ timezone: 'America/New_York' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .patch('/api/users/111/preferences')
      .send({ notification_enabled: true })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});
