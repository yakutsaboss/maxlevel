/**
 * HTTP integration tests for admin users sub-router (bot/src/api/routes/admin-users.ts)
 *
 * Tests GET /api/admin/users, GET /api/admin/users/:userId, PATCH /api/admin/users/:userId,
 * POST /api/admin/users/:userId/deactivate, POST /api/admin/users/:userId/reactivate.
 * Admin authentication is mocked to bypass Basic Auth.
 *
 * All user routes use requirePermission('users:read') or requirePermission('users:update'),
 * except DELETE which requires requireRole('super_admin').
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

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

vi.mock('../../../jobs/registerJobs.js', () => ({
  getRegisteredJobs: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../jobs/boss.js', () => ({
  getJobQueue: vi.fn(),
}));

vi.mock('../../../utils/queries.js', () => ({
  listAllModes: vi.fn().mockResolvedValue([]),
}));

import { getMockDb } from '../../helpers/httpMocks.js';
const { query: mockQuery, queryOne: mockQueryOne, execute: mockExecute } = getMockDb();

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

// ─── GET /api/admin/users ───────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('should return 200 with paginated user list', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, username: 'alice', telegram_id: 111, is_active: true },
      { id: 2, username: 'bob', telegram_id: 222, is_active: true },
      { id: 3, username: 'charlie', telegram_id: 333, is_active: false },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.users).toHaveLength(3);
    expect(res.body.data.limit).toBe(50);
    expect(res.body.data.offset).toBe(0);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should support custom limit and offset parameters', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 11, username: 'user11', telegram_id: 1011 },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/users?limit=10&offset=10')
      .expect(200);

    expect(res.body.data.limit).toBe(10);
    expect(res.body.data.offset).toBe(10);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT $1 OFFSET $2'),
      [10, 10]
    );
  });

  it('should filter active-only users when active=true', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, username: 'alice', is_active: true },
    ]);

    await request(buildApp())
      .get('/api/admin/users?active=true')
      .expect(200);

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('WHERE is_active = true'),
      expect.any(Array)
    );
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(buildApp())
      .get('/api/admin/users')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

// ─── GET /api/admin/users/:userId ───────────────────────────────────

describe('GET /api/admin/users/:userId', () => {
  it('should return 200 with user detail and stats', async () => {
    mockQueryOne
      .mockResolvedValueOnce({ id: 1, username: 'alice', telegram_id: 111, is_active: true })
      .mockResolvedValueOnce({ total_xp: 5000, current_level: 10, streak_days: 7 });

    const res = await request(buildApp())
      .get('/api/admin/users/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.user.telegram_id).toBe(111);
    expect(res.body.data.stats.total_xp).toBe(5000);
    expect(res.body.data.stats.current_level).toBe(10);
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('should return 404 when user does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/admin/users/9999')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });
});

// ─── PATCH /api/admin/users/:userId ─────────────────────────────────

describe('PATCH /api/admin/users/:userId', () => {
  it('should return 200 when updating allowed fields', async () => {
    const updatedUser = { id: 1, username: 'alice_updated', first_name: 'Alice', timezone: 'Europe/Moscow', is_active: true };
    mockQueryOne.mockResolvedValueOnce(updatedUser);

    const res = await request(buildApp())
      .patch('/api/admin/users/1')
      .send({ username: 'alice_updated', timezone: 'Europe/Moscow' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('User updated successfully');
    expect(res.body.data.user.username).toBe('alice_updated');
  });

  it('should return 400 when no valid fields are provided', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/users/1')
      .send({ invalid_field: 'foo', another_bad: 'bar' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No valid fields to update');
  });

  it('should return 400 when body is empty', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/users/1')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No valid fields to update');
  });

  it('should return 404 when updating a non-existent user', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/admin/users/9999')
      .send({ username: 'ghost' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should ignore disallowed fields and only update allowed ones', async () => {
    const updatedUser = { id: 1, username: 'alice', first_name: 'New Name' };
    mockQueryOne.mockResolvedValueOnce(updatedUser);

    await request(buildApp())
      .patch('/api/admin/users/1')
      .send({ first_name: 'New Name', telegram_id: 999, password: 'hacked' })
      .expect(200);

    // Should only include first_name in the SET clause, not telegram_id or password
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('first_name'),
      expect.any(Array)
    );
    const callArgs = mockQueryOne.mock.calls[0];
    expect(callArgs[0]).not.toContain('telegram_id');
    expect(callArgs[0]).not.toContain('password');
  });
});

// ─── POST /api/admin/users/:userId/deactivate ───────────────────────

describe('POST /api/admin/users/:userId/deactivate', () => {
  it('should deactivate a user and return 200', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 1, username: 'alice', is_active: false });

    const res = await request(buildApp())
      .post('/api/admin/users/1/deactivate')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('User deactivated successfully');
    expect(res.body.data.user.is_active).toBe(false);
  });

  it('should return 404 when deactivating non-existent user', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/admin/users/9999/deactivate')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });
});

// ─── POST /api/admin/users/:userId/reactivate ───────────────────────

describe('POST /api/admin/users/:userId/reactivate', () => {
  it('should reactivate a user and return 200', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 1, username: 'alice', is_active: true });

    const res = await request(buildApp())
      .post('/api/admin/users/1/reactivate')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('User reactivated successfully');
    expect(res.body.data.user.is_active).toBe(true);
  });
});
