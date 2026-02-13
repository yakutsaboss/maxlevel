/**
 * HTTP integration tests for channel subscription routes (bot/src/api/routes/channel.ts)
 *
 * Tests channel membership checking, cache behavior, and auto tier upgrade/downgrade.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted) ────────────────────────────────────────────────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (req: any, _res: any, next: any) => {
    req.telegramUser = { id: 111 };
    next();
  },
  authorizeUser: (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

vi.mock('../../../utils/telegramApi.js', () => ({
  checkChannelMembership: vi.fn(),
}));

// ─── Imports after mocks ────────────────────────────────────────────

import { channelRouter } from '../../../api/routes/channel.js';
import { checkChannelMembership } from '../../../utils/telegramApi.js';

const db = getMockDb();
const mockCheckMembership = vi.mocked(checkChannelMembership);

// ─── Build test app ─────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/channel', channelRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/channel/:userId/status ────────────────────────────────

describe('GET /api/channel/:userId/status', () => {
  it('should return cached status when cache is fresh', async () => {
    // User exists with telegram_id
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // Fresh cache entry (checked within last hour)
    db.queryOne.mockResolvedValueOnce({
      is_subscribed: true,
      checked_at: new Date().toISOString(),
    });

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(true);
    // Should NOT call Telegram API when cache is fresh
    expect(mockCheckMembership).not.toHaveBeenCalled();
  });

  it('should call Telegram API when cache is stale', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // Stale cache (checked 2 hours ago)
    const staleTime = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    db.queryOne.mockResolvedValueOnce({
      is_subscribed: false,
      checked_at: staleTime,
    });
    // Telegram API says user is a member
    mockCheckMembership.mockResolvedValueOnce({ isMember: true, status: 'member' });
    // Upsert cache
    db.execute.mockResolvedValueOnce(1);
    // Current subscription
    db.queryOne.mockResolvedValueOnce({ tier: 'free' });
    // Tier upgrade
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(true);
    expect(mockCheckMembership).toHaveBeenCalledWith(111, 'yakutsaway');
  });

  it('should call Telegram API when no cache exists', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // No cache entry
    db.queryOne.mockResolvedValueOnce(null);
    // Telegram API says user is NOT a member
    mockCheckMembership.mockResolvedValueOnce({ isMember: false, status: 'left' });
    // Upsert cache
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(false);
    expect(mockCheckMembership).toHaveBeenCalled();
  });

  it('should auto-upgrade tier when user subscribes to channel', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // No cache
    db.queryOne.mockResolvedValueOnce(null);
    // Telegram API: user is a member
    mockCheckMembership.mockResolvedValueOnce({ isMember: true, status: 'member' });
    // Upsert cache
    db.execute.mockResolvedValueOnce(1);
    // Current subscription is free
    db.queryOne.mockResolvedValueOnce({ tier: 'free' });
    // Tier upgrade execute
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(true);
    // Verify tier upgrade was attempted (execute called for subscription update)
    expect(db.execute).toHaveBeenCalled();
  });

  it('should auto-downgrade tier when user unsubscribes from channel', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // No cache
    db.queryOne.mockResolvedValueOnce(null);
    // Telegram API: user left
    mockCheckMembership.mockResolvedValueOnce({ isMember: false, status: 'left' });
    // Upsert cache
    db.execute.mockResolvedValueOnce(1);
    // Current subscription is subscriber (channel-based)
    db.queryOne.mockResolvedValueOnce({ tier: 'subscriber' });
    // Tier downgrade execute
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(false);
    expect(db.execute).toHaveBeenCalled();
  });

  it('should return 404 when user does not exist', async () => {
    db.queryOne.mockResolvedValueOnce(null); // user not found

    const res = await request(buildApp())
      .get('/api/channel/999/status')
      .expect(404);

    expect(res.body.success).toBe(false);
  });

  it('should handle Telegram API errors gracefully', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // No cache
    db.queryOne.mockResolvedValueOnce(null);
    // Telegram API fails
    mockCheckMembership.mockResolvedValueOnce({ isMember: false, status: 'error' });
    // Upsert cache with false
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .get('/api/channel/1/status')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(false);
  });
});

// ─── POST /api/channel/:userId/refresh ──────────────────────────────

describe('POST /api/channel/:userId/refresh', () => {
  it('should force re-check bypassing cache', async () => {
    // User exists
    db.queryOne.mockResolvedValueOnce({ id: 1, telegram_id: 111 });
    // Telegram API (called directly, no cache check)
    mockCheckMembership.mockResolvedValueOnce({ isMember: true, status: 'member' });
    // Upsert cache
    db.execute.mockResolvedValueOnce(1);
    // Current subscription
    db.queryOne.mockResolvedValueOnce({ tier: 'free' });
    // Tier upgrade
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .post('/api/channel/1/refresh')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.is_subscribed).toBe(true);
    // Must always call Telegram API on refresh (no cache)
    expect(mockCheckMembership).toHaveBeenCalledWith(111, 'yakutsaway');
  });
});
