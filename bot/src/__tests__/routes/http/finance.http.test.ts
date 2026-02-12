/**
 * HTTP integration tests for finance routes (bot/src/api/routes/finance.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
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

// ─── Import router after mocks ──────────────────────────────────────

import { financeRouter } from '../../../api/routes/finance.js';

// ─── Mock refs ──────────────────────────────────────────────────────

const db = getMockDb();

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/finance', financeRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ── GET /api/finance/budget/:userId ─────────────────────────────────

describe('GET /api/finance/budget/:userId', () => {
  it('should return 200 with budget summary', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, category: 'Food', amount: 50, type: 'expense', created_at: '2026-02-10T08:00:00Z' },
      { id: 2, category: 'Salary', amount: 1000, type: 'income', created_at: '2026-02-10T09:00:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/finance/budget/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total_income).toBe(1000);
    expect(res.body.data.total_expense).toBe(50);
    expect(res.body.data.balance).toBe(950);
    expect(res.body.data.entries).toHaveLength(2);
    expect(res.body.data.by_category).toEqual({ Food: 50 });
  });

  it('should return 200 with empty entries', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/finance/budget/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.total_income).toBe(0);
    expect(res.body.data.total_expense).toBe(0);
    expect(res.body.data.balance).toBe(0);
    expect(res.body.data.entries).toHaveLength(0);
  });
});

// ── POST /api/finance/budget ────────────────────────────────────────

describe('POST /api/finance/budget', () => {
  it('should return 200 and create a budget entry', async () => {
    db.execute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: 111, category: 'Food', amount: 50, type: 'expense' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Budget entry created');
    expect(db.execute).toHaveBeenCalledOnce();
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: 111, category: 'Food' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 for invalid type', async () => {
    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: 111, category: 'Food', amount: 50, type: 'donation' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('type must be');
  });

  it('should return 400 for negative amount', async () => {
    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: 111, category: 'Food', amount: -10, type: 'expense' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('amount must be a positive number');
  });

  it('should return 400 for category exceeding 100 chars', async () => {
    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: 111, category: 'A'.repeat(101), amount: 50, type: 'expense' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('category must be a string with max 100 characters');
  });

  it('should return 400 for non-positive userId', async () => {
    const res = await request(buildApp())
      .post('/api/finance/budget')
      .send({ userId: -1, category: 'Food', amount: 50, type: 'expense' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('userId must be a positive integer');
  });
});

// ── GET /api/finance/savings/:userId ────────────────────────────────

describe('GET /api/finance/savings/:userId', () => {
  it('should return 200 with savings goals and deposits', async () => {
    db.query
      .mockResolvedValueOnce([
        { id: 1, name: 'Vacation', target_amount: 5000, current_amount: 1200, created_at: '2026-01-01T00:00:00Z' },
      ])
      .mockResolvedValueOnce([
        { id: 10, amount: 200, created_at: '2026-02-05T00:00:00Z' },
      ]);

    const res = await request(buildApp())
      .get('/api/finance/savings/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.goals).toHaveLength(1);
    expect(res.body.data.goals[0].name).toBe('Vacation');
    expect(res.body.data.goals[0].deposits).toHaveLength(1);
  });

  it('should return 200 with empty goals', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/finance/savings/111')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.goals).toHaveLength(0);
  });
});

// ── POST /api/finance/savings ───────────────────────────────────────

describe('POST /api/finance/savings', () => {
  it('should return 200 and create a savings goal', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 42 });

    const res = await request(buildApp())
      .post('/api/finance/savings')
      .send({ userId: 111, name: 'New Car', targetAmount: 30000 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(42);
    expect(res.body.data.message).toBe('Savings goal created');
  });

  it('should return 400 for missing required fields', async () => {
    const res = await request(buildApp())
      .post('/api/finance/savings')
      .send({ userId: 111 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Missing required fields');
  });

  it('should return 400 for name exceeding 200 chars', async () => {
    const res = await request(buildApp())
      .post('/api/finance/savings')
      .send({ userId: 111, name: 'X'.repeat(201), targetAmount: 1000 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('name must be a string with max 200 characters');
  });

  it('should return 400 for non-positive targetAmount', async () => {
    const res = await request(buildApp())
      .post('/api/finance/savings')
      .send({ userId: 111, name: 'Goal', targetAmount: -500 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('targetAmount must be a positive number');
  });
});

// ── PATCH /api/finance/savings/:id ──────────────────────────────────

describe('PATCH /api/finance/savings/:id', () => {
  it('should return 200 and record deposit', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1, current_amount: 500 });
    db.execute.mockResolvedValue(undefined);

    const res = await request(buildApp())
      .patch('/api/finance/savings/1')
      .send({ amount: 100 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.new_amount).toBe(600);
    expect(res.body.data.message).toBe('Deposit recorded');
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  it('should return 404 for non-existent savings goal', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/finance/savings/999')
      .send({ amount: 100 })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
  });

  it('should return 400 for negative amount', async () => {
    const res = await request(buildApp())
      .patch('/api/finance/savings/1')
      .send({ amount: -50 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('amount must be a positive number');
  });

  it('should return 400 for invalid goal ID', async () => {
    const res = await request(buildApp())
      .patch('/api/finance/savings/abc')
      .send({ amount: 100 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('Invalid savings goal ID');
  });
});

// ── GET /api/finance/categories ─────────────────────────────────────

describe('GET /api/finance/categories', () => {
  it('should return 200 with default categories', async () => {
    const res = await request(buildApp())
      .get('/api/finance/categories')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.categories).toEqual([
      'Food', 'Transport', 'Housing', 'Entertainment',
      'Health', 'Education', 'Shopping', 'Bills', 'Other',
    ]);
  });
});
