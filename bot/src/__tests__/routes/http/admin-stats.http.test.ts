/**
 * HTTP integration tests for admin stats sub-router (bot/src/api/routes/admin-stats.ts)
 *
 * Tests GET /api/admin/stats, POST /api/admin/broadcast, GET /api/admin/logs.
 * Admin authentication is mocked to bypass Basic Auth.
 *
 * FINDING: GET /api/admin/stats and GET /api/admin/modes have NO requireRole
 * middleware — any authenticated admin can access them. POST /broadcast and
 * GET /logs correctly require requireRole('admin').
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: vi.fn(),
}));

vi.mock('../../../api/middleware/adminAuth.js', () => ({
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

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
  testConnection: vi.fn(),
  closePool: vi.fn(),
}));

vi.mock('../../../jobs/registerJobs.js', () => ({
  getRegisteredJobs: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../jobs/boss.js', () => ({
  getJobQueue: vi.fn(),
}));

vi.mock('../../../utils/queries.js', () => ({
  listAllModes: vi.fn().mockResolvedValue([]),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { adminRouter } from '../../../api/routes/admin.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/admin', adminRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

let originalFetch: typeof globalThis.fetch;

beforeEach(() => {
  vi.resetAllMocks();
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

// ─── GET /api/admin/stats ───────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('should return 200 with system statistics', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 150, active: 120 }])
      .mockResolvedValueOnce([{ total: 300, active: 50, completed: 250 }])
      .mockResolvedValueOnce([{ users_with_achievements: 80 }]);

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.users.total).toBe(150);
    expect(res.body.data.users.active).toBe(120);
    expect(res.body.data.quests.total).toBe(300);
    expect(res.body.data.quests.active).toBe(50);
    expect(res.body.data.quests.completed).toBe(250);
    expect(res.body.data.achievements.users_with_achievements).toBe(80);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return 500 when database query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });

  /**
   * FINDING: GET /stats has no requireRole — accessible to any authenticated admin.
   * The route in admin-stats.ts line 27 uses asyncHandler but no role guard.
   */
  it('FINDING: GET /stats has no requireRole — any authenticated admin can access', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 0, active: 0 }])
      .mockResolvedValueOnce([{ total: 0, active: 0, completed: 0 }])
      .mockResolvedValueOnce([{ users_with_achievements: 0 }]);

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(200);

    expect(res.body.success).toBe(true);
  });
});

// ─── POST /api/admin/broadcast ──────────────────────────────────────

describe('POST /api/admin/broadcast', () => {
  it('should broadcast message to all active users', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([
      { telegram_id: 111 },
      { telegram_id: 222 },
      { telegram_id: 333 },
    ]);

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('{}'),
    }) as any;

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Maintenance in 10 minutes!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(3);
    expect(res.body.data.failed).toBe(0);
    expect(res.body.data.total).toBe(3);
    expect(globalThis.fetch).toHaveBeenCalledTimes(3);
  });

  it('should return 400 when message is empty', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Message is required');
  });

  it('should return 400 when message field is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Message is required');
  });

  it('should handle partial send failures gracefully', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([
      { telegram_id: 111 },
      { telegram_id: 222 },
    ]);

    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') })
      .mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve('Forbidden') }) as any;

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Test broadcast' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(1);
    expect(res.body.data.failed).toBe(1);
    expect(res.body.data.total).toBe(2);
  });

  it('should return 200 with zero sent when no active users', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Hello!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(0);
    expect(res.body.data.total).toBe(0);
  });

  it('should return 400 for whitespace-only message', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: '   ' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Message is required');
  });
});

// ─── GET /api/admin/logs ────────────────────────────────────────────

describe('GET /api/admin/logs', () => {
  it('should return recent job history logs', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        name: 'streak-check',
        state: 'completed',
        completedon: '2026-02-10T10:00:00Z',
        output: null,
        createdon: '2026-02-10T09:59:00Z',
      },
      {
        name: 'quest-assign',
        state: 'failed',
        completedon: '2026-02-10T09:00:00Z',
        output: { error: 'timeout' },
        createdon: '2026-02-10T08:59:00Z',
      },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/logs')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.logs[0].level).toBe('info');
    expect(res.body.data.logs[0].source).toBe('job:streak-check');
    expect(res.body.data.logs[1].level).toBe('error');
    expect(res.body.data.logs[1].source).toBe('job:quest-assign');
  });

  it('should return empty logs when no jobs found', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/admin/logs')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(0);
  });
});
