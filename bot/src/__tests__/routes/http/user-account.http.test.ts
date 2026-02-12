/**
 * HTTP integration tests for user account routes
 * (bot/src/api/routes/user-account.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb, getMockAuth, createMockTransaction } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../../api/middleware/auth.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ──────────────────────────────────────

import { accountRouter } from '../../../api/routes/user-account.js';
import { ForbiddenError } from '../../../api/utils/errors.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();
const auth = getMockAuth();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/users', accountRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('PATCH /api/users/:telegramId/profile', () => {
  it('should return 200 with updated profile when updating first_name', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice Updated',
      avatar_id: 3,
      current_level: 5,
      total_xp: 2000,
      timezone: 'UTC',
    });

    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({ first_name: 'Alice Updated' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.first_name).toBe('Alice Updated');
    expect(res.body.data.telegram_id).toBe(111);
  });

  it('should return 200 with updated profile when updating avatar_id', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'Alice',
      avatar_id: 8,
      current_level: 5,
      total_xp: 2000,
      timezone: 'UTC',
    });

    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({ avatar_id: 8 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.avatar_id).toBe(8);
  });

  it('should return 200 when updating both first_name and avatar_id', async () => {
    db.queryOne.mockResolvedValueOnce({
      id: 1,
      telegram_id: 111,
      username: 'alice',
      first_name: 'New Name',
      avatar_id: 12,
      current_level: 5,
      total_xp: 2000,
      timezone: 'UTC',
    });

    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({ first_name: 'New Name', avatar_id: 12 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.first_name).toBe('New Name');
    expect(res.body.data.avatar_id).toBe(12);
  });

  it('should return 400 for empty first_name', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({ first_name: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('first_name must be 1-32 characters');
  });

  it('should return 400 for invalid avatar_id out of range', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({ avatar_id: 17 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('avatar_id must be an integer 1-16');
  });

  it('should return 400 when no valid fields provided', async () => {
    const res = await request(buildApp())
      .patch('/api/users/111/profile')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('No valid fields to update');
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/users/999/profile')
      .send({ first_name: 'Ghost' })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });
});

describe('DELETE /api/users/:telegramId/account', () => {
  it('should return 200 on successful account deletion', async () => {
    db.queryOne.mockResolvedValueOnce({ id: 1 });
    db.transaction.mockImplementation(createMockTransaction());

    const res = await request(buildApp())
      .delete('/api/users/111/account')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Account deleted successfully');
    expect(db.transaction).toHaveBeenCalledOnce();
  });

  it('should return 404 when user not found or already deleted', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .delete('/api/users/999/account')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found or already deleted');
  });

  it('should return 403 when ownership check fails', async () => {
    auth.requireOwnership.mockImplementationOnce(() => {
      throw new ForbiddenError('You do not have permission to access this resource');
    });

    const res = await request(buildApp())
      .delete('/api/users/111/account')
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('You do not have permission to access this resource');
  });
});
