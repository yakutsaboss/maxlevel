/**
 * HTTP integration tests for admin routes (bot/src/api/routes/admin.ts)
 *
 * Tests the 3 admin sub-routers (stats, users, jobs) via supertest.
 * Admin authentication is mocked to bypass Basic Auth; auth is tested
 * separately in middleware/adminAuth.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockExecutePythonTool = vi.fn();
const mockGetUserById = vi.fn();

vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
  getUserByTelegramId: vi.fn(),
  getUserById: (...args: any[]) => mockGetUserById(...args),
}));

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

// ─── Import router after mocks ─────────────────────────────────────

import { adminRouter } from '../../../api/routes/admin.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/admin', adminRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── Stats sub-router ──────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('should return 200 with system statistics', async () => {
    mockExecutePythonTool
      .mockResolvedValueOnce({ success: true, data: [{ total: 100, active: 85 }] })       // users
      .mockResolvedValueOnce({ success: true, data: [{ total: 50, active: 10, completed: 40 }] }) // quests
      .mockResolvedValueOnce({ success: true, data: [{ users_with_achievements: 30 }] }); // achievements

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(200);

    expect(res.body.users.total).toBe(100);
    expect(res.body.users.active).toBe(85);
    expect(res.body.quests.completed).toBe(40);
    expect(res.body.achievements.users_with_achievements).toBe(30);
    expect(res.body.timestamp).toBeDefined();
  });

  it('should return 500 when database throws', async () => {
    mockExecutePythonTool.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/admin/stats')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

// ─── Users sub-router ──────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('should return 200 with user list', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: [
        { id: 1, username: 'alice', telegram_id: 111 },
        { id: 2, username: 'bob', telegram_id: 222 },
      ],
    });

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(200);

    expect(res.body.users).toHaveLength(2);
    expect(res.body.users[0].username).toBe('alice');
    expect(res.body.limit).toBe(50);
    expect(res.body.offset).toBe(0);
  });

  it('should return 500 when python tool fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false, error: 'timeout' });

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('GET /api/admin/users/:userId', () => {
  it('should return 200 with user detail', async () => {
    mockGetUserById.mockResolvedValueOnce({
      success: true,
      data: { id: 1, username: 'alice', telegram_id: 111 },
    });
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { total_xp: 2500, current_level: 5 },
    });

    const res = await request(buildApp())
      .get('/api/admin/users/1')
      .expect(200);

    expect(res.body.user.username).toBe('alice');
    expect(res.body.stats.total_xp).toBe(2500);
  });

  it('should return 404 for unknown user', async () => {
    mockGetUserById.mockResolvedValueOnce({ success: false, data: null });

    const res = await request(buildApp())
      .get('/api/admin/users/999')
      .expect(404);

    expect(res.body.error).toBe('Not Found');
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

    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.jobs[0].name).toBe('streak-check');
  });

  it('should return 500 when getRegisteredJobs throws', async () => {
    mockGetRegisteredJobs.mockImplementationOnce(() => { throw new Error('fail'); });

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
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

    expect(res.body.message).toBe("Job 'streak-check' triggered");
    expect(res.body.jobId).toBe('job-id-123');
  });

  it('should return 503 when job queue is not running', async () => {
    mockGetJobQueue.mockReturnValueOnce(null);

    const res = await request(buildApp())
      .post('/api/admin/jobs/streak-check/trigger')
      .expect(503);

    expect(res.body.error).toBe('Service Unavailable');
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

    expect(res.body.error).toBe('Not Found');
  });
});

// ─── Broadcast ─────────────────────────────────────────────────────

describe('POST /api/admin/broadcast', () => {
  it('should return 501 (not implemented) with valid message', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({ message: 'Hello everyone!' })
      .expect(501);

    expect(res.body.error).toBe('Not Implemented');
  });

  it('should return 400 when message is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/broadcast')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
  });
});
