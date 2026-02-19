/**
 * HTTP integration tests for admin players sub-router (bot/src/api/routes/admin-players.ts)
 *
 * Run 77 Agent I: Tests the admin player management endpoints created by Agent E.
 * Covers: GET /players (pagination, search, sort, filters),
 *         GET /players/:userId (full detail, not found),
 *         POST /players/:userId/award-xp (success, invalid amount),
 *         POST /players/:userId/unlock-achievement (success, already unlocked),
 *         PATCH /players/:userId/tier (success, invalid tier),
 *         POST /players/:userId/message,
 *         GET /audit-log
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

// Mock xpAward — the award-xp route calls transaction(fn) -> awardXp(client, ...)
const mockAwardXp = vi.fn();
vi.mock('../../utils/xpAward.js', () => ({
  awardXp: (...args: unknown[]) => mockAwardXp(...args),
}));

// Mock broadcastMessage — the message route uses it to send Telegram messages
const mockBroadcastMessage = vi.fn();
vi.mock('../../utils/broadcast.js', () => ({
  broadcastMessage: (...args: unknown[]) => mockBroadcastMessage(...args),
}));

import { getMockDb } from '../helpers/httpMocks.js';
const { query: mockQuery, queryOne: mockQueryOne, execute: mockExecute, transaction: mockTransaction } = getMockDb();

// ─── Import router after mocks ─────────────────────────────────────

import { adminPlayersRouter } from '../../api/routes/admin-players.js';

function buildApp() {
  const app = createTestApp();
  // Attach adminUser to all requests (simulates authenticateAdmin middleware)
  app.use((req: any, _res: any, next: any) => {
    req.adminUser = {
      id: 'testadmin',
      username: 'testadmin',
      role: 'super_admin',
      permissions: ['*'],
    };
    next();
  });
  app.use('/api/admin/players', adminPlayersRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Test data ─────────────────────────────────────────────────────

const mockPlayer = {
  id: 1,
  telegram_id: 123456789,
  username: 'alice',
  first_name: 'Alice',
  current_level: 10,
  total_xp: 5000,
  tier: 'free',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T00:00:00Z',
};

const mockPlayer2 = {
  id: 2,
  telegram_id: 987654321,
  username: 'bob',
  first_name: 'Bob',
  current_level: 5,
  total_xp: 1500,
  tier: 'premium',
  is_active: true,
  created_at: '2025-02-01T00:00:00Z',
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

// ─── GET /api/admin/players ────────────────────────────────────────

describe('GET /api/admin/players', () => {
  it('should return 200 with paginated player list', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '2' });      // count query first
    mockQuery.mockResolvedValueOnce([mockPlayer, mockPlayer2]); // players query second

    const res = await request(buildApp())
      .get('/api/admin/players')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.players).toHaveLength(2);
    expect(res.body.data.players[0].username).toBe('alice');
  });

  it('should support pagination with limit and page', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '2' });
    mockQuery.mockResolvedValueOnce([mockPlayer2]);

    const res = await request(buildApp())
      .get('/api/admin/players?limit=1&page=2')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.players).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      expect.arrayContaining([1])
    );
  });

  it('should support text search by username or name', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '1' });
    mockQuery.mockResolvedValueOnce([mockPlayer]);

    const res = await request(buildApp())
      .get('/api/admin/players?search=alice')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.players).toHaveLength(1);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringMatching(/ILIKE|ilike|LOWER/),
      expect.arrayContaining(['%alice%'])
    );
  });

  it('should support sorting by column', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '2' });
    mockQuery.mockResolvedValueOnce([mockPlayer2, mockPlayer]);

    const res = await request(buildApp())
      .get('/api/admin/players?sort=xp&order=desc')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY'),
      expect.any(Array)
    );
  });

  it('should support filtering by tier', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '1' });
    mockQuery.mockResolvedValueOnce([mockPlayer2]);

    const res = await request(buildApp())
      .get('/api/admin/players?tier=premium')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('tier'),
      expect.arrayContaining(['premium'])
    );
  });

  it('should support filtering by date range', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '1' });
    mockQuery.mockResolvedValueOnce([mockPlayer]);

    const res = await request(buildApp())
      .get('/api/admin/players?date_from=2025-01-01&date_to=2025-12-31')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('created_at'),
      expect.any(Array)
    );
  });

  it('should support filtering by active/inactive status', async () => {
    mockQueryOne.mockResolvedValueOnce({ count: '1' });
    mockQuery.mockResolvedValueOnce([mockPlayer]);

    const res = await request(buildApp())
      .get('/api/admin/players?status=active')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockQueryOne).toHaveBeenCalledWith(
      expect.stringContaining('is_active'),
      expect.any(Array)
    );
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(buildApp())
      .get('/api/admin/players')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/admin/players/:userId ────────────────────────────────

describe('GET /api/admin/players/:userId', () => {
  it('should return 200 with full player detail', async () => {
    // 1) Core user lookup (queryOne)
    mockQueryOne.mockResolvedValueOnce(mockPlayer);
    // 2-7) Promise.all: modes, recentQuests, achievements, recentActivities (query),
    //       stats (queryOne), contentProgress (query)
    mockQuery.mockResolvedValueOnce([{ name: 'fitness', display_name: 'Fitness', icon_emoji: '💪', enabled_at: '2025-01-01' }]); // modes
    mockQuery.mockResolvedValueOnce([{ quest_name: 'First Quest', status: 'completed', started_at: '2025-01-01', completed_at: '2025-01-02', xp_reward: 100 }]); // recentQuests
    mockQuery.mockResolvedValueOnce([{ name: 'Early Bird', description: 'Wake up early', unlocked_at: '2025-01-01', icon: '🐤', rarity: 'common' }]); // achievements
    mockQuery.mockResolvedValueOnce([]); // recentActivities
    mockQueryOne.mockResolvedValueOnce({ quests_completed: '1', total_activities: '0', total_calories: '0', articles_read: '0' }); // stats
    mockQuery.mockResolvedValueOnce([]); // contentProgress

    const res = await request(buildApp())
      .get('/api/admin/players/1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.username).toBe('alice');
    expect(res.body.data.user.id).toBe(1);
  });

  it('should return 404 when player does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/admin/players/9999')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ─── POST /api/admin/players/:userId/award-xp ─────────────────────

describe('POST /api/admin/players/:userId/award-xp', () => {
  it('should award XP and return 200', async () => {
    // 1) User existence check (queryOne)
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // 2) transaction calls awardXp internally — mock transaction to execute callback
    mockTransaction.mockImplementation(async (fn: any) => fn({}));
    mockAwardXp.mockResolvedValueOnce({ totalXp: 5500, newLevel: 11, oldLevel: 10, leveledUp: true });
    // 3) audit log (execute) — called inside logAuditAction
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/admin/players/1/award-xp')
      .send({ amount: 500, reason: 'Contest winner' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.totalXp).toBe(5500);
    expect(res.body.data.newLevel).toBe(11);
    expect(res.body.data.leveledUp).toBe(true);
  });

  it('should return 400 for invalid XP amount (negative)', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/award-xp')
      .send({ amount: -100 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/XP amount/i);
  });

  it('should return 400 for missing amount', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/award-xp')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 for zero XP amount', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/award-xp')
      .send({ amount: 0 })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 404 when player does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null); // user not found

    const res = await request(buildApp())
      .post('/api/admin/players/9999/award-xp')
      .send({ amount: 500 })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/players/:userId/unlock-achievement ────────────

describe('POST /api/admin/players/:userId/unlock-achievement', () => {
  it('should unlock achievement and return 200', async () => {
    // 1) User existence check
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // 2) Achievement existence check
    mockQueryOne.mockResolvedValueOnce({ id: 1, name: 'Early Bird' });
    // 3) Check if already unlocked — null means not yet unlocked
    mockQueryOne.mockResolvedValueOnce(null);
    // 4) INSERT user_achievements (execute)
    mockExecute.mockResolvedValueOnce(undefined);
    // 5) Audit log (execute)
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/admin/players/1/unlock-achievement')
      .send({ achievement_id: 1 })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.achievement_name).toBe('Early Bird');
  });

  it('should return 400 when achievement already unlocked', async () => {
    // 1) User existence check
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // 2) Achievement existence check
    mockQueryOne.mockResolvedValueOnce({ id: 1, name: 'Early Bird' });
    // 3) Already unlocked — returns existing row
    mockQueryOne.mockResolvedValueOnce({ id: 1, achievement_id: 1, user_id: 1 });

    const res = await request(buildApp())
      .post('/api/admin/players/1/unlock-achievement')
      .send({ achievement_id: 1 })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/already/i);
  });

  it('should return 400 when achievement_id is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/unlock-achievement')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });
});

// ─── PATCH /api/admin/players/:userId/tier ─────────────────────────

describe('PATCH /api/admin/players/:userId/tier', () => {
  it('should change tier and return 200', async () => {
    // 1) User existence check
    mockQueryOne.mockResolvedValueOnce({ id: 1 });
    // 2) Upsert subscription RETURNING tier
    mockQueryOne.mockResolvedValueOnce({ tier: 'premium' });
    // 3) Audit log (execute)
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .patch('/api/admin/players/1/tier')
      .send({ tier: 'premium' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.tier).toBe('premium');
  });

  it('should return 400 for invalid tier value', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/players/1/tier')
      .send({ tier: 'nonexistent_tier' })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/invalid|tier/i);
  });

  it('should return 400 when tier is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/admin/players/1/tier')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 404 when player does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/admin/players/9999/tier')
      .send({ tier: 'premium' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ─── POST /api/admin/players/:userId/message ──────────────────────

describe('POST /api/admin/players/:userId/message', () => {
  it('should send message and return 200', async () => {
    // Set bot token env var (required by the route)
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    // 1) Get user's telegram_id (queryOne)
    mockQueryOne.mockResolvedValueOnce({ telegram_id: 123456789 });
    // 2) broadcastMessage returns sent/failed counts
    mockBroadcastMessage.mockResolvedValueOnce({ sent: 1, failed: 0 });
    // 3) Audit log (execute)
    mockExecute.mockResolvedValueOnce(undefined);

    const res = await request(buildApp())
      .post('/api/admin/players/1/message')
      .send({ text: 'Hello from admin!' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toBe('Message sent successfully');
    expect(mockBroadcastMessage).toHaveBeenCalledWith('test-token', [123456789], 'Hello from admin!');
  });

  it('should return 400 when message text is empty', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/message')
      .send({ text: '' })
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 400 when message text is missing', async () => {
    const res = await request(buildApp())
      .post('/api/admin/players/1/message')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
  });

  it('should return 404 when player does not exist', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'test-token';
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/admin/players/9999/message')
      .send({ text: 'Hello' })
      .expect(404);

    expect(res.body.success).toBe(false);
  });
});

// ─── GET /api/admin/players/audit-log ──────────────────────────────

describe('GET /api/admin/players/audit-log', () => {
  it('should return 200 with audit log entries', async () => {
    // 1) Count query (queryOne)
    mockQueryOne.mockResolvedValueOnce({ count: '2' });
    // 2) Logs query (query)
    mockQuery.mockResolvedValueOnce([
      { id: 1, admin_id: 'testadmin', action: 'award_xp', target_user_id: 1, details: { amount: 500 }, created_at: '2025-01-01T00:00:00Z' },
      { id: 2, admin_id: 'testadmin', action: 'change_tier', target_user_id: 2, details: { tier: 'premium' }, created_at: '2025-01-02T00:00:00Z' },
    ]);

    const res = await request(buildApp())
      .get('/api/admin/players/audit-log')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.logs).toHaveLength(2);
    expect(res.body.data.logs[0].action).toBe('award_xp');
  });

  it('should support pagination for audit log', async () => {
    // 1) Count query (queryOne)
    mockQueryOne.mockResolvedValueOnce({ count: '0' });
    // 2) Logs query (query)
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/admin/players/audit-log?limit=10&page=1')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT'),
      expect.any(Array)
    );
  });
});
