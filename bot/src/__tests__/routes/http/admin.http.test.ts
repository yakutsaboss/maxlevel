/**
 * HTTP integration tests for admin routes (bot/src/api/routes/admin.ts)
 *
 * Tests the 3 admin sub-routers (stats, users, jobs) via supertest.
 * Admin authentication is mocked to bypass Basic Auth; auth is tested
 * separately in middleware/adminAuth.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

// Mock adminAuth — bypass authentication, attach a super_admin user
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

const mockGetRegisteredJobs = vi.fn();
const mockGetJobQueue = vi.fn();

vi.mock('../../../jobs/registerJobs.js', () => ({
  getRegisteredJobs: (...args: any[]) => mockGetRegisteredJobs(...args),
}));

vi.mock('../../../jobs/boss.js', () => ({
  getJobQueue: (...args: any[]) => mockGetJobQueue(...args),
}));

import { getMockDb } from '../../helpers/httpMocks.js';
const { query: mockQuery, queryOne: mockQueryOne } = getMockDb();

// ─── Import router after mocks ─────────────────────────────────────

import { adminRouter } from '../../../api/routes/admin.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/admin', adminRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Stats sub-router ──────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('should return 200 with system statistics', async () => {
    mockQuery
      .mockResolvedValueOnce([{ total: 100, active: 85 }])
      .mockResolvedValueOnce([{ total: 50, active: 10, completed: 40 }])
      .mockResolvedValueOnce([{ users_with_achievements: 30 }]);

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(200);

    expect(res.body.data.users.total).toBe(100);
    expect(res.body.data.users.active).toBe(85);
    expect(res.body.data.quests.completed).toBe(40);
    expect(res.body.data.achievements.users_with_achievements).toBe(30);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── Users sub-router ──────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('should return 200 with user list', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, username: 'alice', telegram_id: 111 },
      { id: 2, username: 'bob', telegram_id: 222 },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(200);

    expect(res.body.data.users).toHaveLength(2);
    expect(res.body.data.users[0].username).toBe('alice');
    expect(res.body.data.limit).toBe(50);
    expect(res.body.data.offset).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB query failed'));

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/admin/users/:userId', () => {
  it('should return 200 with user detail', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: 1, username: 'alice', telegram_id: 111 })
      .mockResolvedValueOnce({ total_xp: 2500, current_level: 5 });

    const res = await request(buildApp())
      .get('/api/admin/users/1')
      .expect(200);

    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.stats.total_xp).toBe(2500);
  });

  it('should return 404 for unknown user', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/admin/users/999')
      .expect(404);

    expect(res.body.error).toBe('User not found');
  });
});

// ─── Jobs sub-router ───────────────────────────────────────────────

describe('GET /api/admin/jobs', () => {
  it('should return 200 with registered jobs', async () => {
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
      { name: 'daily-quest-reset', cron: '0 0 * * *' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(200);

    expect(res.body.data.jobs).toHaveLength(2);
    expect(res.body.data.jobs[0].name).toBe('streak-check');
  });

  it('should return 500 when getRegisteredJobs throws', async () => {
    mockGetRegisteredJobs.mockImplementationOnce(() => { throw new Error('fail'); });

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(500);

    expect(res.body.error).toBe('Failed to list jobs');
  });
});

describe('POST /api/admin/jobs/:name/trigger', () => {
  it('should return 200 when triggering a registered job', async () => {
    const mockBoss = { send: vi.fn().mockResolvedValueOnce('job-id-123') };
    mockGetJobQueue.mockReturnValueOnce(mockBoss);
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/jobs/streak-check/trigger')
      .expect(200);

    expect(res.body.data.message).toBe("Job 'streak-check' triggered");
    expect(res.body.data.jobId).toBe('job-id-123');
  });

  it('should return 503 when job queue is not running', async () => {
    mockGetJobQueue.mockReturnValueOnce(null);

    const res = await request(buildApp())
      .post('/api/admin/jobs/streak-check/trigger')
      .expect(503);

    expect(res.body.error).toBe('Job queue is not running');
  });

  it('should return 404 for unknown job name', async () => {
    const mockBoss = { send: vi.fn() };
    mockGetJobQueue.mockReturnValueOnce(mockBoss);
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/jobs/nonexistent/trigger')
      .expect(404);

    expect(res.body.error).toContain('not found');
  });
});

// ─── Broadcast ─────────────────────────────────────────────────────

describe('POST /api/admin/broadcast', () => {
  it('should broadcast to all active users', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([
      { telegram_id: 111 },
      { telegram_id: 222 },
    ]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve('{}') }) as any;

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Hello everyone!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(2);
    expect(res.body.data.failed).toBe(0);
    expect(res.body.data.total).toBe(2);

    globalThis.fetch = originalFetch;
  });

  it('should return 200 with zero sent when no active users', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Hello everyone!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(0);
    expect(res.body.data.total).toBe(0);
  });

  it('should return 400 when message is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Message is required');
  });

  it('should handle failed message sends gracefully', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQuery.mockResolvedValueOnce([
      { telegram_id: 111 },
      { telegram_id: 222 },
    ]);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, text: () => Promise.resolve('{}') })
      .mockResolvedValueOnce({ ok: false, status: 403, text: () => Promise.resolve('Forbidden') }) as any;

    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Hello!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.sent).toBe(1);
    expect(res.body.data.failed).toBe(1);

    globalThis.fetch = originalFetch;
  });
});

// ─── Logs ─────────────────────────────────────────────────────────

describe('GET /api/admin/logs', () => {
  it('should return job history logs', async () => {
    mockQuery.mockResolvedValueOnce([
      { name: 'streak-check', state: 'completed', completedon: '2026-02-09T10:00:00Z', output: null, createdon: '2026-02-09T09:59:00Z' },
      { name: 'quest-assign', state: 'failed', completedon: '2026-02-09T09:00:00Z', output: { error: 'timeout' }, createdon: '2026-02-09T08:59:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/logs')
      .expect(200);

    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.logs[0].level).toBe('info');
    expect(res.body.data.logs[0].source).toBe('job:streak-check');
    expect(res.body.data.logs[1].level).toBe('error');
  });

  it('should return empty logs when no jobs found', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/admin/logs')
      .expect(200);

    expect(res.body.data.logs).toHaveLength(0);
  });
});
