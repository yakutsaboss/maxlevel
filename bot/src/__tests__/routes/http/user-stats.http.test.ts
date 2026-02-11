/**
 * HTTP integration tests for user stats routes
 * (bot/src/api/routes/user-stats.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  getPool: vi.fn(),
}));

vi.mock('../../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

const mockExecutePythonTool = vi.fn();
vi.mock('../../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
  getUserByTelegramId: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock('../../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (_req: any, _res: any, next: any) => next(),
  requireOwnership: vi.fn(),
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { statsRouter } from '../../../api/routes/user-stats.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/users', statsRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Helpers ────────────────────────────────────────────────────────

/** Set up mocks for a successful GET /stats request with default empty data. */
function mockStatsHappyPath(userOverrides: Record<string, any> = {}) {
  const defaultUser = {
    id: 1,
    telegram_id: 111,
    username: 'alice',
    first_name: 'Alice',
    avatar_id: 3,
    current_level: 5,
    total_xp: 2000,
    is_active: true,
    timezone: 'UTC',
    created_at: '2025-01-01',
    current_streak: 7,
    longest_streak: 14,
    total_quests_completed: 42,
  };

  // 1st mockQueryOne: resolveUser
  mockQueryOne.mockResolvedValueOnce({ ...defaultUser, ...userOverrides });

  // Promise.all: [modes, activeQuests, aggregates, modeStreaks]
  mockQuery
    .mockResolvedValueOnce([])   // modes
    .mockResolvedValueOnce([])   // activeQuests
    .mockResolvedValueOnce([]);  // modeStreaks
  mockQueryOne
    .mockResolvedValueOnce({ completed_today: 3, xp_today: 150, days_active: 20 }); // aggregates

  // recentAchievementsRows
  mockQuery.mockResolvedValueOnce([]);
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/users/:telegramId/stats', () => {
  it('should return 200 with all expected fields in response', async () => {
    mockStatsHappyPath();

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(200);

    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data).toHaveProperty('user');
    expect(data).toHaveProperty('modes');
    expect(data).toHaveProperty('activeQuests');
    expect(data).toHaveProperty('completedQuestsToday');
    expect(data).toHaveProperty('recentAchievements');
    expect(data).toHaveProperty('xpGainedToday');
    expect(data).toHaveProperty('streakData');
    expect(data).toHaveProperty('perModeStreaks');
  });

  it('should return 404 when user does not exist', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/users/999/stats')
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return correct XP/level/streak data', async () => {
    mockStatsHappyPath({
      current_level: 10,
      total_xp: 5000,
      current_streak: 15,
      longest_streak: 30,
    });

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(200);

    const data = res.body.data;
    expect(data.user.level).toBe(10);
    expect(data.user.xp).toBe(5000);
    expect(data.streakData.current).toBe(15);
    expect(data.streakData.longest).toBe(30);
    expect(data.streakData.daysActive).toBe(20);
  });

  it('should return quest and achievement counts', async () => {
    // resolveUser
    mockQueryOne.mockResolvedValueOnce({
      id: 1, telegram_id: 111, username: 'alice', first_name: 'Alice',
      avatar_id: 3, current_level: 5, total_xp: 2000, is_active: true,
      timezone: 'UTC', created_at: '2025-01-01',
      current_streak: 5, longest_streak: 10, total_quests_completed: 42,
    });

    // Promise.all
    mockQuery
      .mockResolvedValueOnce([])   // modes
      .mockResolvedValueOnce([])   // activeQuests
      .mockResolvedValueOnce([]);  // modeStreaks
    mockQueryOne
      .mockResolvedValueOnce({ completed_today: 5, xp_today: 250, days_active: 30 });

    // recentAchievements — include some data
    mockQuery.mockResolvedValueOnce([
      {
        user_id: 1, achievement_id: 10, unlocked_at: '2025-06-01',
        name: 'First Quest', description: 'Complete your first quest',
        icon: '\u{1F3C6}', xp_reward: 50, rarity: 'common', category: 'general',
      },
    ]);

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(200);

    const data = res.body.data;
    expect(data.completedQuestsToday).toBe(5);
    expect(data.xpGainedToday).toBe(250);
    expect(data.recentAchievements).toHaveLength(1);
    expect(data.recentAchievements[0].achievement.name).toBe('First Quest');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('DB down'));

    const res = await request(buildApp())
      .get('/api/users/111/stats')
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('GET /api/users/:telegramId/quests/active', () => {
  it('should return 200 with active quests', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        id: 1, user_id: 1, mode_id: 1, title: 'Morning Run',
        description: 'Go for a run', xp_reward: 50, frequency: 'daily',
        difficulty: 'medium', status: 'in_progress', progress: 1, target: 3,
        due_date: '2025-06-15', completed_at: null,
        mode_name: 'fitness', mode_display_name: 'Fitness', mode_icon: '\u{1F3CB}',
      },
    ]);

    const res = await request(buildApp())
      .get('/api/users/111/quests/active')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Morning Run');
    expect(res.body.data[0].status).toBe('active');
    expect(res.body.data[0].mode.display_name).toBe('Fitness');
  });

  it('should return empty array when no active quests', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/users/111/quests/active')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});

describe('GET /api/users/:telegramId/quests/completed', () => {
  it('should return 200 with completed quests', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        id: 2, user_id: 1, mode_id: 1, title: 'Read 30 mins',
        description: 'Read a book', xp_reward: 30, frequency: 'daily',
        difficulty: 'easy', status: 'completed', progress: 1, target: 1,
        due_date: '2025-06-14', completed_at: '2025-06-14T18:00:00',
        mode_name: 'learning', mode_display_name: 'Learning', mode_icon: '\u{1F4DA}',
      },
    ]);

    const res = await request(buildApp())
      .get('/api/users/111/quests/completed')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Read 30 mins');
    expect(res.body.data[0].status).toBe('completed');
  });
});

describe('GET /api/users/:telegramId/achievements', () => {
  it('should return 200 with user achievements', async () => {
    mockQuery.mockResolvedValueOnce([
      {
        user_id: 1, achievement_id: 5, unlocked_at: '2025-06-10',
        name: 'Streak Master', description: '7-day streak',
        icon: '\u{1F525}', xp_reward: 100, rarity: 'rare', category: 'fitness',
      },
    ]);

    const res = await request(buildApp())
      .get('/api/users/111/achievements')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].achievement.name).toBe('Streak Master');
    expect(res.body.data[0].achievement.rarity).toBe('rare');
  });

  it('should return empty array when no achievements', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/users/111/achievements')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(0);
  });
});
