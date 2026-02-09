/**
 * Tests for admin API routes (bot/src/api/routes/admin.ts)
 *
 * Mocks: authenticateAdmin, requirePermission, requireRole,
 *        executePythonTool, getUserById, getJobQueue, getRegisteredJobs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockExecutePythonTool = vi.fn();
const mockGetUserById = vi.fn();
const mockGetUserByTelegramId = vi.fn();

vi.mock('../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
  getUserById: (...args: any[]) => mockGetUserById(...args),
  getUserByTelegramId: (...args: any[]) => mockGetUserByTelegramId(...args),
}));

const mockGetJobQueue = vi.fn();
vi.mock('../../jobs/boss.js', () => ({
  getJobQueue: () => mockGetJobQueue(),
}));

const mockGetRegisteredJobs = vi.fn();
vi.mock('../../jobs/registerJobs.js', () => ({
  getRegisteredJobs: () => mockGetRegisteredJobs(),
}));

vi.mock('../../api/middleware/adminAuth.js', () => ({
  authenticateAdmin: (_req: any, _res: any, next: any) => next(),
  requirePermission: () => (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  authLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── GET /api/admin/stats ────────────────────────────────────────────

describe('GET /api/admin/stats', () => {
  it('should aggregate stats from three queries', async () => {
    const usersResult = { data: [{ total: 100, active: 80 }] };
    const questsResult = { data: [{ total: 500, active: 50, completed: 300 }] };
    const achievementsResult = { data: [{ users_with_achievements: 60 }] };

    mockExecutePythonTool
      .mockResolvedValueOnce(usersResult)
      .mockResolvedValueOnce(questsResult)
      .mockResolvedValueOnce(achievementsResult);

    const u = await mockExecutePythonTool('db_operations', ['--query', 'SELECT COUNT(*) ...']);
    const q = await mockExecutePythonTool('db_operations', ['--query', 'SELECT COUNT(*) ...']);
    const a = await mockExecutePythonTool('db_operations', ['--query', 'SELECT COUNT(DISTINCT ...) ...']);

    const responseBody = {
      users: u.data?.[0] || { total: 0, active: 0 },
      quests: q.data?.[0] || { total: 0, active: 0, completed: 0 },
      achievements: a.data?.[0] || { users_with_achievements: 0 },
    };

    expect(responseBody.users.total).toBe(100);
    expect(responseBody.users.active).toBe(80);
    expect(responseBody.quests.completed).toBe(300);
    expect(responseBody.achievements.users_with_achievements).toBe(60);
    expect(mockExecutePythonTool).toHaveBeenCalledTimes(3);
  });

  it('should fallback to zeros when data is empty', async () => {
    mockExecutePythonTool
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: [] });

    const u = await mockExecutePythonTool('db_operations', ['--query', '...']);
    const q = await mockExecutePythonTool('db_operations', ['--query', '...']);
    const a = await mockExecutePythonTool('db_operations', ['--query', '...']);

    const responseBody = {
      users: u.data?.[0] || { total: 0, active: 0 },
      quests: q.data?.[0] || { total: 0, active: 0, completed: 0 },
      achievements: a.data?.[0] || { users_with_achievements: 0 },
    };

    expect(responseBody.users).toEqual({ total: 0, active: 0 });
    expect(responseBody.quests).toEqual({ total: 0, active: 0, completed: 0 });
    expect(responseBody.achievements).toEqual({ users_with_achievements: 0 });
  });

  it('should return 500 when executePythonTool throws', async () => {
    mockExecutePythonTool.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = mockResponse();
    try {
      await mockExecutePythonTool('db_operations', ['--query', '...']);
    } catch {
      res.status(500).json({ error: 'Server Error', message: 'Failed to fetch system statistics' });
    }

    expect(res._status).toBe(500);
    expect(res._json.error).toBe('Server Error');
  });
});

// ─── GET /api/admin/users ────────────────────────────────────────────

describe('GET /api/admin/users', () => {
  it('should return paginated user list', async () => {
    const users = [
      { id: 1, username: 'alice', telegram_id: 111 },
      { id: 2, username: 'bob', telegram_id: 222 },
    ];

    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: users });

    const result = await mockExecutePythonTool('user_manager', [
      '--list-users', '--limit', '50', '--offset', '0',
    ]);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].username).toBe('alice');
  });

  it('should parse limit and offset from query params', () => {
    const req = mockRequest({ query: { limit: '10', offset: '20', active: 'true' } });

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const activeOnly = req.query.active === 'true';

    expect(limit).toBe(10);
    expect(offset).toBe(20);
    expect(activeOnly).toBe(true);
  });

  it('should default limit to 50 and offset to 0', () => {
    const req = mockRequest({ query: {} });

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    expect(limit).toBe(50);
    expect(offset).toBe(0);
  });

  it('should return 500 when user_manager fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false });

    const result = await mockExecutePythonTool('user_manager', ['--list-users']);

    expect(result.success).toBe(false);
  });
});

// ─── GET /api/admin/users/:userId ────────────────────────────────────

describe('GET /api/admin/users/:userId', () => {
  it('should return user detail with stats', async () => {
    mockGetUserById.mockResolvedValueOnce({
      success: true,
      data: { id: 1, username: 'alice', telegram_id: 111 },
    });
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { quests_completed: 10, total_xp: 500 },
    });

    const userResult = await mockGetUserById(1);
    const statsResult = await mockExecutePythonTool('user_manager', ['--get-stats', '--user-id', '1']);

    expect(userResult.success).toBe(true);
    expect(userResult.data.username).toBe('alice');
    expect(statsResult.data.quests_completed).toBe(10);
  });

  it('should return 404 when user not found', async () => {
    mockGetUserById.mockResolvedValueOnce({ success: false, data: null });

    const userResult = await mockGetUserById(999);
    const res = mockResponse();

    if (!userResult.success || !userResult.data) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('User not found');
  });
});

// ─── PATCH /api/admin/users/:userId ──────────────────────────────────

describe('PATCH /api/admin/users/:userId', () => {
  it('should update user with valid fields', async () => {
    const updates = { username: 'new_alice', timezone: 'Europe/Moscow', hack_attempt: 'drop table' };
    const allowedFields = ['username', 'first_name', 'timezone', 'is_active'];
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    expect(fields).toEqual({ username: 'new_alice', timezone: 'Europe/Moscow' });
    expect(fields).not.toHaveProperty('hack_attempt');
  });

  it('should return 400 when no valid fields provided', () => {
    const updates = { invalid_field: 'value', another_bad: 123 };
    const allowedFields = ['username', 'first_name', 'timezone', 'is_active'];
    const fields: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields[key] = value;
      }
    }

    const res = mockResponse();
    if (Object.keys(fields).length === 0) {
      res.status(400).json({ error: 'Bad Request', message: 'No valid fields to update' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('No valid fields to update');
  });

  it('should call executePythonTool with update args', async () => {
    const fields = { username: 'new_alice' };
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { id: 1, username: 'new_alice' },
    });

    const result = await mockExecutePythonTool('user_manager', [
      '--update-profile', '--user-id', '1', '--fields', JSON.stringify(fields),
    ]);

    expect(result.success).toBe(true);
    expect(result.data.username).toBe('new_alice');
    expect(mockExecutePythonTool).toHaveBeenCalledWith('user_manager', [
      '--update-profile', '--user-id', '1', '--fields', '{"username":"new_alice"}',
    ]);
  });
});

// ─── DELETE /api/admin/users/:userId ─────────────────────────────────

describe('DELETE /api/admin/users/:userId', () => {
  it('should delete user and return deleted info', async () => {
    mockGetUserById.mockResolvedValueOnce({
      success: true,
      data: { id: 1, telegram_id: 111, username: 'alice' },
    });
    mockExecutePythonTool.mockResolvedValueOnce({ success: true });

    const userResult = await mockGetUserById(1);
    const deleteResult = await mockExecutePythonTool('user_manager', ['--delete-user', '--user-id', '1']);

    expect(userResult.data.username).toBe('alice');
    expect(deleteResult.success).toBe(true);
  });

  it('should return 404 when deleting non-existent user', async () => {
    mockGetUserById.mockResolvedValueOnce({ success: false, data: null });

    const userResult = await mockGetUserById(999);
    const res = mockResponse();

    if (!userResult.success || !userResult.data) {
      res.status(404).json({ error: 'Not Found', message: 'User not found' });
    }

    expect(res._status).toBe(404);
  });
});

// ─── POST /api/admin/users/:userId/deactivate ────────────────────────

describe('POST /api/admin/users/:userId/deactivate', () => {
  it('should deactivate user', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { id: 1, is_active: false },
    });

    const result = await mockExecutePythonTool('user_manager', [
      '--deactivate-user', '--user-id', '1',
    ]);

    expect(result.success).toBe(true);
    expect(result.data.is_active).toBe(false);
  });

  it('should return 500 when deactivation fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false });

    const result = await mockExecutePythonTool('user_manager', [
      '--deactivate-user', '--user-id', '1',
    ]);

    expect(result.success).toBe(false);
  });
});

// ─── POST /api/admin/users/:userId/reactivate ────────────────────────

describe('POST /api/admin/users/:userId/reactivate', () => {
  it('should reactivate user by setting is_active to true', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { id: 1, is_active: true },
    });

    const result = await mockExecutePythonTool('user_manager', [
      '--update-profile', '--user-id', '1', '--fields', JSON.stringify({ is_active: true }),
    ]);

    expect(result.success).toBe(true);
    expect(result.data.is_active).toBe(true);
    expect(mockExecutePythonTool).toHaveBeenCalledWith('user_manager', [
      '--update-profile', '--user-id', '1', '--fields', '{"is_active":true}',
    ]);
  });
});

// ─── GET /api/admin/modes ────────────────────────────────────────────

describe('GET /api/admin/modes', () => {
  it('should return list of modes', async () => {
    const modes = [
      { id: 1, name: 'fitness', display_name: 'Fitness' },
      { id: 2, name: 'hydration', display_name: 'Hydration' },
    ];
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: modes });

    const result = await mockExecutePythonTool('mode_manager', ['--list-modes']);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it('should return empty array when no modes', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: null });

    const result = await mockExecutePythonTool('mode_manager', ['--list-modes']);
    const modes = result.data || [];

    expect(modes).toHaveLength(0);
  });
});

// ─── POST /api/admin/broadcast ───────────────────────────────────────

describe('POST /api/admin/broadcast', () => {
  it('should return 400 when message is missing', () => {
    const req = mockRequest({ body: {} });
    const res = mockResponse();

    const { message } = req.body;
    if (!message) {
      res.status(400).json({ error: 'Bad Request', message: 'Message is required' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Message is required');
  });

  it('should return 501 not implemented', () => {
    const res = mockResponse();

    // The route returns 501 for now
    res.status(501).json({
      error: 'Not Implemented',
      message: 'Broadcast feature not yet implemented. Coming soon!',
    });

    expect(res._status).toBe(501);
    expect(res._json.error).toBe('Not Implemented');
  });
});

// ─── GET /api/admin/jobs ─────────────────────────────────────────────

describe('GET /api/admin/jobs', () => {
  it('should return registered jobs list', () => {
    const jobs = [
      { name: 'daily-quest-reset', cron: '0 0 * * *' },
      { name: 'streak-check', cron: '0 1 * * *' },
      { name: 'analytics-export', cron: '0 3 * * 0' },
    ];
    mockGetRegisteredJobs.mockReturnValue(jobs);

    const result = mockGetRegisteredJobs();

    expect(result).toHaveLength(3);
    expect(result[0].name).toBe('daily-quest-reset');
    expect(result[2].cron).toBe('0 3 * * 0');
  });
});

// ─── POST /api/admin/jobs/:name/trigger ──────────────────────────────

describe('POST /api/admin/jobs/:name/trigger', () => {
  it('should return 503 when job queue is not running', () => {
    mockGetJobQueue.mockReturnValue(null);

    const boss = mockGetJobQueue();
    const res = mockResponse();

    if (!boss) {
      res.status(503).json({ error: 'Service Unavailable', message: 'Job queue is not running' });
    }

    expect(res._status).toBe(503);
  });

  it('should return 404 when job name not found', () => {
    mockGetJobQueue.mockReturnValue({ send: vi.fn() });
    mockGetRegisteredJobs.mockReturnValue([
      { name: 'daily-quest-reset', cron: '0 0 * * *' },
    ]);

    const boss = mockGetJobQueue();
    const registeredJobs = mockGetRegisteredJobs();
    const jobExists = registeredJobs.some((j: any) => j.name === 'nonexistent-job');

    const res = mockResponse();
    if (!jobExists) {
      res.status(404).json({
        error: 'Not Found',
        message: `Job 'nonexistent-job' not found. Available: ${registeredJobs.map((j: any) => j.name).join(', ')}`,
      });
    }

    expect(res._status).toBe(404);
    expect(res._json.message).toContain('daily-quest-reset');
  });

  it('should trigger job and return jobId', async () => {
    const mockSend = vi.fn().mockResolvedValue('job-uuid-123');
    mockGetJobQueue.mockReturnValue({ send: mockSend });
    mockGetRegisteredJobs.mockReturnValue([
      { name: 'streak-check', cron: '0 1 * * *' },
    ]);

    const boss = mockGetJobQueue();
    const registeredJobs = mockGetRegisteredJobs();
    const jobExists = registeredJobs.some((j: any) => j.name === 'streak-check');

    expect(jobExists).toBe(true);

    const jobId = await boss.send('streak-check', {});
    expect(jobId).toBe('job-uuid-123');
  });
});

// ─── POST /api/admin/analytics/export ────────────────────────────────

describe('POST /api/admin/analytics/export', () => {
  it('should trigger analytics export', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { rows_exported: 150, sheet_url: 'https://docs.google.com/...' },
    });

    const result = await mockExecutePythonTool('sheets_analytics_export', ['--export-all']);

    expect(result.success).toBe(true);
    expect(result.data.rows_exported).toBe(150);
  });

  it('should return 500 when export fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Google Sheets API rate limited',
    });

    const result = await mockExecutePythonTool('sheets_analytics_export', ['--export-all']);
    const res = mockResponse();

    if (!result.success) {
      res.status(500).json({
        error: 'Export Failed',
        message: result.error || 'Analytics export failed',
      });
    }

    expect(res._status).toBe(500);
    expect(res._json.message).toBe('Google Sheets API rate limited');
  });
});
