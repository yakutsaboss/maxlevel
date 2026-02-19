/**
 * HTTP integration tests for admin notifications sub-router (bot/src/api/routes/admin-notifications.ts)
 *
 * Run 77 Agent I: Tests the admin notification center endpoints created by Agent G.
 * Covers: GET /notifications (paginated, filtered by type),
 *         PATCH /notifications/:id (mark as read),
 *         POST /notifications/mark-all-read,
 *         GET /notifications/unread-count
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
const { query: mockQuery, queryOne: mockQueryOne, execute: mockExecute } = getMockDb();

// ─── Import router after mocks ─────────────────────────────────────

import { adminNotificationsRouter } from '../../api/routes/admin-notifications.js';

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
  app.use('/api/admin/notifications', adminNotificationsRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ─────────────────────────────────────────────────────

const mockNotification1 = {
  id: 1,
  type: 'new_registration',
  title: 'New user registered',
  message: 'User alice joined the platform',
  user_id: 1,
  is_read: false,
  created_at: '2025-02-01T10:00:00Z',
};

const mockNotification2 = {
  id: 2,
  type: 'achievement_unlock',
  title: 'Achievement unlocked',
  message: 'User bob unlocked Early Bird',
  user_id: 2,
  is_read: false,
  created_at: '2025-02-01T11:00:00Z',
};

const mockNotification3 = {
  id: 3,
  type: 'payment',
  title: 'Payment received',
  message: 'User charlie upgraded to premium',
  user_id: 3,
  is_read: true,
  created_at: '2025-02-01T09:00:00Z',
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/admin/notifications ──────────────────────────────────

describe('GET /api/admin/notifications', () => {
  it('should return 200 with paginated notifications', async () => {
    mockQuery
      .mockResolvedValueOnce([mockNotification1, mockNotification2, mockNotification3]);
    mockQueryOne
      .mockResolvedValueOnce({ total: 3 });

    const res = await request(buildApp())
      .get('/api/admin/notifications')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(3);
  });

  it('should support pagination with limit and offset', async () => {
    mockQuery
      .mockResolvedValueOnce([mockNotification2]);
    mockQueryOne
      .mockResolvedValueOnce({ total: 3 });

    const res = await request(buildApp())
      .get('/api/admin/notifications?limit=1&offset=1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      expect.any(Array)
    );
  });

  it('should support filtering by notification type', async () => {
    mockQuery
      .mockResolvedValueOnce([mockNotification1]);
    mockQueryOne
      .mockResolvedValueOnce({ total: 1 });

    const res = await request(buildApp())
      .get('/api/admin/notifications?type=new_registration')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(1);
    expect(res.body.data.notifications[0].type).toBe('new_registration');
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('type'),
      expect.arrayContaining(['new_registration'])
    );
  });

  it('should support filtering by read/unread status', async () => {
    mockQuery
      .mockResolvedValueOnce([mockNotification1, mockNotification2]);
    mockQueryOne
      .mockResolvedValueOnce({ total: 2 });

    const res = await request(buildApp())
      .get('/api/admin/notifications?is_read=false')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notifications).toHaveLength(2);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('is_read'),
      expect.any(Array)
    );
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp())
      .get('/api/admin/notifications')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── PATCH /api/admin/notifications/:id ────────────────────────────

describe('PATCH /api/admin/notifications/:id/read', () => {
  it('should mark notification as read and return 200', async () => {
    mockQueryOne.mockResolvedValueOnce({ ...mockNotification1, is_read: true });

    const res = await request(buildApp())
      .patch('/api/admin/notifications/1/read')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.notification.is_read).toBe(true);
  });

  it('should return 404 when notification does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/admin/notifications/9999/read')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─── POST /api/admin/notifications/mark-all-read ───────────────────

describe('POST /api/admin/notifications/mark-all-read', () => {
  it('should mark all notifications as read and return 200', async () => {
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/admin/notifications/mark-all-read')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockExecute).toHaveBeenCalledWith(
      expect.stringContaining('is_read')
    );
  });

  it('should return 500 when database throws', async () => {
    mockExecute.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(buildApp())
      .post('/api/admin/notifications/mark-all-read')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/admin/notifications/unread-count ─────────────────────

describe('GET /api/admin/notifications/unread-count', () => {
  it('should return 200 with unread count', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 5 });

    const res = await request(buildApp())
      .get('/api/admin/notifications/unread-count')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(5);
  });

  it('should return 0 when no unread notifications', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: 0 });

    const res = await request(buildApp())
      .get('/api/admin/notifications/unread-count')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.count).toBe(0);
  });
});
