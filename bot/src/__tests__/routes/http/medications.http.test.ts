/**
 * HTTP integration tests for medication CRUD routes (bot/src/api/routes/medications.ts)
 *
 * Run 87 Agent H: Tests the medication management API created by Agent B.
 * Covers: list, create, update, soft-delete, today's schedule.
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

import { medicationRouter } from '../../../api/routes/medications.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/medications', medicationRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ──────────────────────────────────────────────────────

const mockMedication = {
  id: 1,
  user_id: 1,
  name: 'Aspirin',
  dosage: '100mg',
  frequency: 'daily',
  time_of_day: ['08:00', '20:00'],
  color: '#FF5733',
  notes: 'Take with food',
  is_active: true,
  created_at: '2026-02-20T00:00:00Z',
};

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/medications/:userId', () => {
  it('should return 200 with list of active medications', async () => {
    db.query.mockResolvedValueOnce([mockMedication, { ...mockMedication, id: 2, name: 'Vitamin D' }]);

    const res = await request(buildApp())
      .get('/api/medications/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.medications).toHaveLength(2);
    expect(res.body.data.medications[0].name).toBe('Aspirin');
    expect(res.body.data.count).toBe(2);
  });

  it('should return empty array when no medications', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/medications/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.medications).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 400 for invalid user ID', async () => {
    const res = await request(buildApp())
      .get('/api/medications/abc')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/medications/111')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('POST /api/medications', () => {
  it('should return 200/201 and create a medication', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // user lookup (queryOne)
    db.query.mockResolvedValueOnce([mockMedication]); // INSERT RETURNING

    const res = await request(buildApp())
      .post('/api/medications')
      .send({
        telegram_id: '111',
        name: 'Aspirin',
        dosage: '100mg',
        frequency: 'daily',
        time_of_day: ['08:00', '20:00'],
        color: '#FF5733',
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  it('should return 400 when name is missing', async () => {
    const res = await request(buildApp())
      .post('/api/medications')
      .send({
        telegram_id: '111',
        frequency: 'daily',
        time_of_day: ['08:00'],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when telegram_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/medications')
      .send({
        name: 'Aspirin',
        frequency: 'daily',
        time_of_day: ['08:00'],
      })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .post('/api/medications')
      .send({
        telegram_id: '111',
        name: 'Aspirin',
        frequency: 'daily',
        time_of_day: ['08:00'],
      })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('PATCH /api/medications/:id', () => {
  it('should return 200 and update medication', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 }); // ownership check (queryOne)
    db.query.mockResolvedValueOnce([{ ...mockMedication, name: 'Aspirin Extra' }]); // UPDATE RETURNING

    const res = await request(buildApp())
      .patch('/api/medications/1')
      .send({ telegram_id: '111', name: 'Aspirin Extra' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 when medication not found', async () => {
    db.queryOne.mockResolvedValueOnce(null); // no rows (queryOne)

    const res = await request(buildApp())
      .patch('/api/medications/999')
      .send({ telegram_id: '111', name: 'Ghost Med' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp())
      .patch('/api/medications/1')
      .send({ telegram_id: '111', name: 'Aspirin Extra' })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('DELETE /api/medications/:id', () => {
  it('should return 200 and soft-delete medication', async () => {
    db.query.mockResolvedValueOnce([{ id: 1 }]); // UPDATE RETURNING (single query in route)

    const res = await request(buildApp())
      .delete('/api/medications/1')
      .send({ telegram_id: '111' })
      .expect(200);

    expect(res.body.success).toBe(true);
  });

  it('should return 404 when medication not found', async () => {
    db.query.mockResolvedValueOnce([]); // no rows

    const res = await request(buildApp())
      .delete('/api/medications/999')
      .send({ telegram_id: '111' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp())
      .delete('/api/medications/1')
      .send({ telegram_id: '111' })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/medications/:userId/today', () => {
  it('should return 200 with today\'s schedule', async () => {
    const schedule = [
      { ...mockMedication, status: 'taken', logged_at: '2026-02-20T08:05:00Z' },
      { ...mockMedication, id: 2, name: 'Vitamin D', status: 'pending', logged_at: null },
    ];
    db.query.mockResolvedValueOnce(schedule);

    const res = await request(buildApp())
      .get('/api/medications/111/today')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule).toHaveLength(2);
    expect(res.body.data.summary).toBeDefined();
    expect(res.body.data.summary.taken).toBe(1);
    expect(res.body.data.summary.total).toBe(2);
  });

  it('should return empty array when no medications scheduled', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/medications/111/today')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.schedule).toHaveLength(0);
    expect(res.body.data.summary.total).toBe(0);
  });

  it('should return 400 for invalid user ID', async () => {
    const res = await request(buildApp())
      .get('/api/medications/abc/today')
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(buildApp())
      .get('/api/medications/111/today')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
