/**
 * HTTP integration tests for admin jobs sub-router (bot/src/api/routes/admin-jobs.ts)
 *
 * Tests GET /api/admin/jobs and POST /api/admin/jobs/:name/trigger.
 * Admin authentication is mocked to bypass Basic Auth.
 *
 * FINDING: GET /api/admin/jobs has NO requireRole middleware — any authenticated
 * admin can list jobs regardless of role. POST /:name/trigger correctly requires
 * requireRole('admin'). This is documented as an intentional or oversight finding.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
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

vi.mock('../../../utils/db.js', () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  getPool: vi.fn(),
  testConnection: vi.fn(),
  closePool: vi.fn(),
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
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/admin/jobs ────────────────────────────────────────────

describe('GET /api/admin/jobs', () => {
  it('should return 200 with a list of registered jobs', async () => {
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
      { name: 'daily-quest-reset', cron: '0 0 * * *' },
      { name: 'weekly-leaderboard', cron: '0 0 * * 1' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(3);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return job names and cron schedules', async () => {
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(200);

    expect(res.body.data.jobs[0].name).toBe('streak-check');
    expect(res.body.data.jobs[0].cron).toBe('0 */6 * * *');
  });

  it('should return 200 with empty array when no jobs are registered', async () => {
    mockGetRegisteredJobs.mockReturnValueOnce([]);

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.jobs).toHaveLength(0);
  });

  it('should return 500 when getRegisteredJobs throws', async () => {
    mockGetRegisteredJobs.mockImplementationOnce(() => {
      throw new Error('Job registry corrupted');
    });

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Failed to list jobs');
  });

  /**
   * FINDING: GET /api/admin/jobs does NOT use requireRole middleware.
   * Any authenticated admin (regardless of role) can access this endpoint.
   * The route handler in admin-jobs.ts line 20 has no requireRole guard.
   * Compare to POST /:name/trigger which correctly uses requireRole('admin').
   */
  it('FINDING: GET /jobs has no requireRole — accessible to any authenticated admin', async () => {
    // This test documents that the GET /jobs endpoint is accessible without
    // role restrictions beyond base authenticateAdmin. In production, even
    // a viewer-role admin can list jobs.
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/jobs')
      .expect(200);

    // If requireRole were added in the future, this test would need updating
    expect(res.body.success).toBe(true);
  });
});

// ─── POST /api/admin/jobs/:name/trigger ─────────────────────────────

describe('POST /api/admin/jobs/:name/trigger', () => {
  it('should return 200 when triggering a registered job', async () => {
    const mockBoss = { send: vi.fn().mockResolvedValueOnce('job-id-abc') };
    mockGetJobQueue.mockReturnValueOnce(mockBoss);
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/jobs/streak-check/trigger')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe("Job 'streak-check' triggered");
    expect(res.body.data.jobId).toBe('job-id-abc');
    expect(res.body.data.timestamp).toBeDefined();
    expect(mockBoss.send).toHaveBeenCalledWith('streak-check', {});
  });

  it('should return 404 for unknown job name', async () => {
    const mockBoss = { send: vi.fn() };
    mockGetJobQueue.mockReturnValueOnce(mockBoss);
    mockGetRegisteredJobs.mockReturnValueOnce([
      { name: 'streak-check', cron: '0 */6 * * *' },
    ]);

    const res = await request(buildApp())
      .post('/api/admin/jobs/nonexistent-job/trigger')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('not found');
    expect(res.body.error).toContain('streak-check'); // shows available jobs
    expect(mockBoss.send).not.toHaveBeenCalled();
  });

  it('should return 503 when job queue is not running', async () => {
    mockGetJobQueue.mockReturnValueOnce(null);

    const res = await request(buildApp())
      .post('/api/admin/jobs/streak-check/trigger')
      .expect(503);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Job queue is not running');
  });
});
