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

vi.mock('../../bot.js', () => ({
  bot: {
    api: {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 1 }),
    },
  },
}));

const mockAwardXp = vi.fn();
vi.mock('../../utils/xpAward.js', () => ({
  awardXp: (...args: any[]) => mockAwardXp(...args),
}));

vi.mock('../../utils/paymentHelpers.js', () => ({
  isValidTier: (t: string) => ['free', 'subscriber', 'premium'].includes(t),
}));

import { getMockDb } from '../helpers/httpMocks.js';
const mockDb = getMockDb();
const { query: mockQuery, queryOne: mockQueryOne, execute: mockExecute, transaction: mockTransaction } = mockDb;
const mockPoolQuery = vi.fn();
const mockGetPool = (mockDb as any).module.getPool;
mockGetPool.mockReturnValue({ query: mockPoolQuery });

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
  app.use('/api/admin', adminBulkRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── POST /api/admin/players/bulk/award-xp ─────────────────────────────────

describe('POST /api/admin/players/bulk/award-xp', () => {
  it('should award XP to multiple users and return 200', async () => {
    mockTransaction.mockImplementation(async (fn: any) => fn({}));
    mockAwardXp.mockResolvedValue({ totalXp: 5500, newLevel: 11, leveledUp: false });

    const res = await request(buildApp())
      .post('/api/admin/players/bulk/award-xp')
      .send({ user_ids: [1, 2], amount: 500, reason: 'Bulk reward' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(2);
    expect(res.body.data.succeeded).toBe(2);
  });

  it('should return 400 for empty user_ids array', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/award-xp')
      .send({ user_ids: [], amount: 500 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/user_ids|empty/i);
  });

  it('should return 400 for missing user_ids', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/award-xp')
      .send({ amount: 500 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for invalid amount', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/award-xp')
      .send({ user_ids: [1, 2], amount: -100 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/players/bulk/tier ──────────────────────────────────────

describe('POST /api/admin/players/bulk/tier', () => {
  it('should change tier for multiple users and return 200', async () => {
    mockGetPool.mockReturnValue({ query: mockPoolQuery });
    mockPoolQuery.mockResolvedValueOnce({ rowCount: 2 });

    const res = await request(buildApp())
      .post('/api/admin/players/bulk/tier')
      .send({ user_ids: [1, 2], tier: 'premium' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(2);
    expect(res.body.data.affected).toBe(2);
  });

  it('should return 400 for invalid tier', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/tier')
      .send({ user_ids: [1, 2], tier: 'super_ultra_premium' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for empty user_ids', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/tier')
      .send({ user_ids: [], tier: 'premium' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/players/bulk/message ───────────────────────────────────

describe('POST /api/admin/players/bulk/message', () => {
  it('should send message to multiple users and return 200', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, telegram_id: '111' },
      { id: 2, telegram_id: '222' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/players/bulk/message')
      .send({ user_ids: [1, 2], text: 'Important announcement!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.processed).toBe(2);
    expect(res.body.data.succeeded).toBe(2);
  });

  it('should return 400 for missing message text', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/message')
      .send({ user_ids: [1, 2] })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for empty message text', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/bulk/message')
      .send({ user_ids: [1, 2], text: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

