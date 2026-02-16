/**
 * HTTP integration tests for punishment Stars deduction (bot/src/api/routes/punishment.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 *
 * Run 68 Agent E: Tests for POST /punishment/:telegramId/deduct
 * and STARS_PENALTY_RATES constants added by Agent B.
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

// ─── Import router + constants after mocks ──────────────────────────

import { punishmentRouter } from '../../../api/routes/punishment.js';
import { STARS_PENALTY_RATES } from '../../../api/utils/constants.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/punishment', punishmentRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ──────────────────────────────────────────────────────

const dbUser = { id: 42 };

const mockDeductionResult = {
  id: 1,
  user_id: 42,
  punishment_type: 'stars_deduction',
  severity: 'manual',
  xp_deducted: 0,
  streak_days_lost: 0,
  message_sent: null,
  applied_at: '2026-02-15T12:00:00Z',
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── STARS_PENALTY_RATES constants ─────────────────────────────────

describe('STARS_PENALTY_RATES', () => {
  it('should define penalty rates for all intensity levels', () => {
    expect(STARS_PENALTY_RATES).toBeDefined();
    expect(STARS_PENALTY_RATES.light).toBe(1);
    expect(STARS_PENALTY_RATES.moderate).toBe(3);
    expect(STARS_PENALTY_RATES.strict).toBe(5);
    expect(STARS_PENALTY_RATES.extreme).toBe(10);
  });

  it('should have exactly 4 intensity levels', () => {
    expect(Object.keys(STARS_PENALTY_RATES)).toHaveLength(4);
  });

  it('should have increasing penalty rates', () => {
    const rates = Object.values(STARS_PENALTY_RATES) as number[];
    for (let i = 1; i < rates.length; i++) {
      expect(rates[i]).toBeGreaterThan(rates[i - 1]);
    }
  });
});

// ─── POST /api/punishment/:telegramId/deduct ───────────────────────

describe('POST /api/punishment/:telegramId/deduct', () => {
  it('should successfully create a Stars deduction record', async () => {
    // queryOne: user lookup
    db.queryOne.mockResolvedValueOnce(dbUser);
    // queryOne: insert into punishment_history
    db.queryOne.mockResolvedValueOnce(mockDeductionResult);

    const res = await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ amount: 5, reason: 'Missed daily goal' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.punishment_type).toBe('stars_deduction');
  });

  it('should record the deduction in punishment_history', async () => {
    db.queryOne.mockResolvedValueOnce(dbUser);
    db.queryOne.mockResolvedValueOnce(mockDeductionResult);

    await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ amount: 10, reason: 'Test deduction' })
      .expect(200);

    // Verify the INSERT was called with stars_deduction type
    const insertCall = db.queryOne.mock.calls[1];
    expect(insertCall[0]).toContain('punishment_history');
    expect(insertCall[0]).toContain('stars_deduction');
  });

  it('should return 400 for missing amount', async () => {
    const res = await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ reason: 'No amount' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for missing reason', async () => {
    const res = await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ amount: 5 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid (non-numeric) telegramId', async () => {
    const res = await request(buildApp())
      .post('/api/punishment/abc/deduct')
      .send({ amount: 5, reason: 'Test' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid telegram ID');
  });

  it('should return 404 when user not found', async () => {
    db.queryOne.mockResolvedValueOnce(null); // user not found

    const res = await request(buildApp())
      .post('/api/punishment/999999/deduct')
      .send({ amount: 5, reason: 'Test' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for zero or negative amount', async () => {
    const res = await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ amount: 0, reason: 'Zero test' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 500 when database throws', async () => {
    db.queryOne.mockRejectedValueOnce(new Error('DB failure'));

    const res = await request(buildApp())
      .post('/api/punishment/123456/deduct')
      .send({ amount: 5, reason: 'Test' })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
