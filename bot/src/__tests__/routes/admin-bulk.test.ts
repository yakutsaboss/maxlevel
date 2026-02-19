/**
 * HTTP integration tests for admin bulk operations sub-router (bot/src/api/routes/admin-bulk.ts)
 *
 * Run 77 Agent I: Tests the bulk admin actions created by Agent F.
 * Covers: POST /bulk/award-xp (multiple users), POST /bulk/tier (change tier),
 *         POST /bulk/message, POST /bulk/export, error cases.
 *
 * All routes require admin authentication (mocked).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

vi.mock('../../utils/db.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../utils/pythonTools.js', async () =>
  (await import('../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../api/middleware/adminAuth.js', () => ({
  authenticateAdmin: (req: any, _res: any, next: any) => {
    req.adminUser = {
      id: 'testadmin',
      username: 'testadmin',
      role: 'super_admin',
      permissions: ['*'],
    };
    next();
  },
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../jobs/registerJobs.js', () => ({
  getRegisteredJobs: vi.fn().mockReturnValue([]),
}));

vi.mock('../../jobs/boss.js', () => ({
  getJobQueue: vi.fn(),
}));

vi.mock('../../utils/queries.js', () => ({
  listAllModes: vi.fn().mockResolvedValue([]),
}));

import { getMockDb } from '../helpers/httpMocks.js';
const { query: mockQuery, queryOne: mockQueryOne, execute: mockExecute, transaction: mockTransaction } = getMockDb();

// ─── Import router after mocks ─────────────────────────────────────

import { adminBulkRouter } from '../../api/routes/admin-bulk.js';

function buildApp() {
  const app = createTestApp();
  app.use((req: any, _res: any, next: any) => {
    req.adminUser = {
      id: 'testadmin',
      username: 'testadmin',
      role: 'super_admin',
      permissions: ['*'],
    };
    next();
  });
  app.use('/api/admin/bulk', adminBulkRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── POST /api/admin/bulk/award-xp ─────────────────────────────────

describe('POST /api/admin/bulk/award-xp', () => {
  it('should award XP to multiple users and return 200', async () => {
    const mockTxClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTxClient));
    mockTxClient.query
      .mockResolvedValueOnce({ rows: [{ id: 1, total_xp: 5500 }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, total_xp: 2000 }] })
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const res = await request(buildApp())
      .post('/api/admin/bulk/award-xp')
      .send({ user_ids: [1, 2], amount: 500, reason: 'Bulk reward' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(2);
  });

  it('should return 400 for empty user_ids array', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/award-xp')
      .send({ user_ids: [], amount: 500 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/user_ids|empty/i);
  });

  it('should return 400 for missing user_ids', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/award-xp')
      .send({ amount: 500 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid amount', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/award-xp')
      .send({ user_ids: [1, 2], amount: -100 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/bulk/tier ──────────────────────────────────────

describe('POST /api/admin/bulk/tier', () => {
  it('should change tier for multiple users and return 200', async () => {
    const mockTxClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    mockTransaction.mockImplementation(async (fn: any) => fn(mockTxClient));
    mockTxClient.query
      .mockResolvedValueOnce({ rows: [{ id: 1, tier: 'premium' }] })
      .mockResolvedValueOnce({ rows: [{ id: 2, tier: 'premium' }] })
      .mockResolvedValueOnce({ rows: [] }); // audit log

    const res = await request(buildApp())
      .post('/api/admin/bulk/tier')
      .send({ user_ids: [1, 2], tier: 'premium' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(2);
  });

  it('should return 400 for invalid tier', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/tier')
      .send({ user_ids: [1, 2], tier: 'super_ultra_premium' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for empty user_ids', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/tier')
      .send({ user_ids: [], tier: 'premium' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/bulk/message ───────────────────────────────────

describe('POST /api/admin/bulk/message', () => {
  it('should send message to multiple users and return 200', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, telegram_id: 111 },
      { id: 2, telegram_id: 222 },
    ]);
    mockExecute.mockResolvedValueOnce(undefined); // audit log

    const res = await request(buildApp())
      .post('/api/admin/bulk/message')
      .send({ user_ids: [1, 2], text: 'Important announcement!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(2);
  });

  it('should return 400 for missing message text', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/message')
      .send({ user_ids: [1, 2] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for empty message text', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/message')
      .send({ user_ids: [1, 2], text: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/bulk/export ────────────────────────────────────

describe('POST /api/admin/bulk/export', () => {
  it('should export selected users as CSV and return 200', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, username: 'alice', telegram_id: 111, current_level: 10, total_xp: 5000, tier: 'free' },
      { id: 2, username: 'bob', telegram_id: 222, current_level: 5, total_xp: 1500, tier: 'premium' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/bulk/export')
      .send({ user_ids: [1, 2] })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
  });

  it('should return 400 for empty user_ids', async () => {
    const res = await request(buildApp())
      .post('/api/admin/bulk/export')
      .send({ user_ids: [] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});
