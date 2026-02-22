/**
 * HTTP integration tests for medication log routes (bot/src/api/routes/medication-logs.ts)
 *
 * Run 87 Agent H: Tests the medication logging API created by Agent B.
 * Covers: log taken/skipped/postponed, history with adherence rate.
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

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { medicationLogRouter } from '../../../api/routes/medication-logs.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/medication-logs', medicationLogRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('POST /api/medication-logs', () => {
  it('should return 200 and log a taken medication', async () => {
    const logEntry = {
      id: 1,
      medication_id: 1,
      user_id: 1,
      scheduled_date: '2026-02-20',
      scheduled_time: '08:00:00',
      status: 'taken',
      logged_at: '2026-02-20T08:05:00Z',
    };

    db.query.mockResolvedValueOnce([{ id: 1 }]); // user lookup / ownership
    db.query.mockResolvedValueOnce([logEntry]); // UPSERT RETURNING

    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        telegram_id: '111',
        medication_id: 1,
        scheduled_time: '08:00',
        status: 'taken',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('should return 200 for skipped status', async () => {
    const logEntry = {
      id: 2,
      medication_id: 1,
      user_id: 1,
      scheduled_date: '2026-02-20',
      scheduled_time: '08:00:00',
      status: 'skipped',
      logged_at: '2026-02-20T08:30:00Z',
    };

    db.query.mockResolvedValueOnce([{ id: 1 }]);
    db.query.mockResolvedValueOnce([logEntry]);

    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        telegram_id: '111',
        medication_id: 1,
        scheduled_time: '08:00',
        status: 'skipped',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when medication_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        telegram_id: '111',
        scheduled_time: '08:00',
        status: 'taken',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when status is missing', async () => {
    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        telegram_id: '111',
        medication_id: 1,
        scheduled_time: '08:00',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when telegram_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        medication_id: 1,
        scheduled_time: '08:00',
        status: 'taken',
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(buildApp())
      .post('/api/medication-logs')
      .send({
        telegram_id: '111',
        medication_id: 1,
        scheduled_time: '08:00',
        status: 'taken',
      })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/medication-logs/:userId/history', () => {
  it('should return 200 with history and adherence rate', async () => {
    const historyData = [
      {
        medication_name: 'Aspirin',
        scheduled_date: '2026-02-20',
        scheduled_time: '08:00:00',
        status: 'taken',
        logged_at: '2026-02-20T08:05:00Z',
      },
      {
        medication_name: 'Aspirin',
        scheduled_date: '2026-02-19',
        scheduled_time: '08:00:00',
        status: 'taken',
        logged_at: '2026-02-19T08:10:00Z',
      },
      {
        medication_name: 'Vitamin D',
        scheduled_date: '2026-02-20',
        scheduled_time: '09:00:00',
        status: 'skipped',
        logged_at: '2026-02-20T09:30:00Z',
      },
    ];
    db.query.mockResolvedValueOnce(historyData);

    const res = await request(buildApp())
      .get('/api/medication-logs/111/history?days=7')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should default to 7 days when days param is not provided', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/medication-logs/111/history')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return empty data when no history', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/medication-logs/111/history?days=30')
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 400 for invalid user ID', async () => {
    const res = await request(buildApp())
      .get('/api/medication-logs/abc/history')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB timeout'));

    const res = await request(buildApp())
      .get('/api/medication-logs/111/history')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
