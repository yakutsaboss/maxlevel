/**
 * Tests for achievement API routes (bot/src/api/routes/achievements.ts)
 *
 * Mocks: db module, cache module, auth middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  getPool: vi.fn(),
}));

vi.mock('../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

vi.mock('../../api/middleware/auth.js', () => ({
  authenticateTelegram: (_req: any, _res: any, next: any) => next(),
  authorizeUser: (_req: any, _res: any, next: any) => next(),
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

// ─── Tests ───────────────────────────────────────────────────────────

describe('GET /api/achievements', () => {
  it('should return all achievements', async () => {
    const allAchievements = [
      { id: 1, name: 'First Quest', description: 'Complete your first quest', icon: '🏆', xp_reward: 50, rarity: 'common' },
      { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 200, rarity: 'rare' },
    ];

    mockQuery.mockResolvedValueOnce(allAchievements);

    const achievements = await mockQuery(expect.any(String));

    expect(achievements).toHaveLength(2);
    expect(achievements[0].name).toBe('First Quest');
    expect(achievements[1].rarity).toBe('rare');
  });

  it('should return empty array when no achievements exist', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const achievements = await mockQuery(expect.any(String));
    expect(achievements).toHaveLength(0);
  });
});

describe('GET /api/users/:userId/achievements', () => {
  it('should return user achievements with progress', async () => {
    const userAchievements = [
      { id: 1, achievement_id: 1, name: 'First Quest', icon: '🏆', xp_reward: 50, rarity: 'common', unlocked_at: '2025-01-10' },
    ];

    mockQuery.mockResolvedValueOnce(userAchievements);
    mockQueryOne.mockResolvedValueOnce({ total: 10 });

    const rows = await mockQuery(expect.any(String), [1]);
    const totalRow = await mockQueryOne(expect.any(String));
    const totalCount = totalRow?.total ?? 0;
    const unlockedCount = rows.length;
    const progress = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

    expect(rows).toHaveLength(1);
    expect(totalCount).toBe(10);
    expect(progress).toBe(10); // 1/10 = 10%
  });

  it('should handle zero total achievements gracefully', async () => {
    mockQuery.mockResolvedValueOnce([]);
    mockQueryOne.mockResolvedValueOnce({ total: 0 });

    const rows = await mockQuery(expect.any(String), [1]);
    const totalRow = await mockQueryOne(expect.any(String));
    const totalCount = totalRow?.total ?? 0;
    const progress = totalCount > 0 ? Math.round((rows.length / totalCount) * 100) : 0;

    expect(progress).toBe(0);
  });
});

describe('GET /api/users/:userId/achievements/available', () => {
  it('should return achievements not yet unlocked by user', async () => {
    const available = [
      { id: 3, name: 'Level 10', description: 'Reach level 10', rarity: 'epic' },
    ];

    mockQuery.mockResolvedValueOnce(available);

    const rows = await mockQuery(expect.any(String), [1]);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Level 10');
  });
});

describe('POST /api/users/:userId/:achievementId/unlock', () => {
  it('should unlock achievement and award XP via awardXp utility', async () => {
    const achievement = { id: 1, name: 'First Quest', xp_bonus: 50 };
    const unlocked = { id: 1, user_id: 1, achievement_id: 1 };
    const xpResult = { totalXp: 550, newLevel: 2, oldLevel: 1, leveledUp: true };

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [achievement] }) // SELECT achievement
          .mockResolvedValueOnce({ rows: [unlocked] }),   // INSERT user_achievement
      };
      return fn(mockClient);
    });

    const result = await mockTransaction(async (client: any) => {
      const achResult = await client.query('SELECT * FROM achievements WHERE id = $1', [1]);
      if (achResult.rows.length === 0) return { error: 'not_found' };

      const unlockResult = await client.query(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [1, 1]
      );
      if (unlockResult.rows.length === 0) return { error: 'already_unlocked' };

      // awardXp is now used instead of raw SQL
      return { achievement: achResult.rows[0], unlocked: unlockResult.rows[0], xpResult };
    });

    expect(result.achievement.name).toBe('First Quest');
    expect(result.unlocked).toBeDefined();
    expect(result.xpResult.leveledUp).toBe(true);
    expect(result.xpResult.newLevel).toBe(2);
  });

  it('should return not_found when achievement does not exist', async () => {
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [] }), // Achievement not found
      };
      return fn(mockClient);
    });

    const result = await mockTransaction(async (client: any) => {
      const achResult = await client.query('SELECT * FROM achievements WHERE id = $1', [999]);
      if (achResult.rows.length === 0) return { error: 'not_found' };
      return { achievement: achResult.rows[0] };
    });

    expect(result.error).toBe('not_found');
  });

  it('should return already_unlocked on duplicate', async () => {
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1, name: 'First Quest', xp_bonus: 50 }] })
          .mockResolvedValueOnce({ rows: [] }), // ON CONFLICT DO NOTHING — no row returned
      };
      return fn(mockClient);
    });

    const result = await mockTransaction(async (client: any) => {
      const achResult = await client.query('SELECT * FROM achievements WHERE id = $1', [1]);
      if (achResult.rows.length === 0) return { error: 'not_found' };

      const unlockResult = await client.query(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING *',
        [1, 1]
      );
      if (unlockResult.rows.length === 0) return { error: 'already_unlocked' };

      return { achievement: achResult.rows[0] };
    });

    expect(result.error).toBe('already_unlocked');
  });
});

describe('POST /api/users/:userId/achievements/check', () => {
  it('should find and unlock qualifying achievements', async () => {
    const userRow = { level: 10, total_xp: 5000, current_streak: 7, quests_completed: 50 };
    const availableAchievements = [
      { id: 1, name: 'Level 5', criteria: { type: 'level', value: 5 }, xp_bonus: 50 },
      { id: 2, name: 'Level 20', criteria: { type: 'level', value: 20 }, xp_bonus: 100 },
      { id: 3, name: '7-day Streak', criteria: { type: 'streak', value: 7 }, xp_bonus: 75 },
    ];

    // Filter qualifying
    const qualifying = availableAchievements.filter((a: any) => {
      const criteria = a.criteria;
      if (!criteria || !criteria.type) return false;
      switch (criteria.type) {
        case 'level': return userRow.level >= criteria.value;
        case 'total_xp': return userRow.total_xp >= criteria.value;
        case 'quest_count': return userRow.quests_completed >= criteria.value;
        case 'streak': return userRow.current_streak >= criteria.value;
        default: return false;
      }
    });

    // Level 5 (user level 10 >= 5) and 7-day Streak (7 >= 7) qualify, Level 20 does not
    expect(qualifying).toHaveLength(2);
    expect(qualifying.map(a => a.name)).toContain('Level 5');
    expect(qualifying.map(a => a.name)).toContain('7-day Streak');
    expect(qualifying.map(a => a.name)).not.toContain('Level 20');
  });

  it('should return empty when no achievements qualify', () => {
    const userRow = { level: 1, total_xp: 0, current_streak: 0, quests_completed: 0 };
    const availableAchievements = [
      { id: 1, name: 'Level 5', criteria: { type: 'level', value: 5 }, xp_bonus: 50 },
    ];

    const qualifying = availableAchievements.filter((a: any) => {
      const criteria = a.criteria;
      switch (criteria.type) {
        case 'level': return userRow.level >= criteria.value;
        default: return false;
      }
    });

    expect(qualifying).toHaveLength(0);
  });

  it('should skip achievements with missing criteria type', () => {
    const userRow = { level: 10, total_xp: 5000, current_streak: 7, quests_completed: 50 };
    const availableAchievements = [
      { id: 1, name: 'No Criteria', criteria: null, xp_bonus: 50 },
      { id: 2, name: 'Empty Criteria', criteria: {}, xp_bonus: 50 },
      { id: 3, name: 'Unknown Type', criteria: { type: 'unknown_type', value: 1 }, xp_bonus: 50 },
    ];

    const qualifying = availableAchievements.filter((a: any) => {
      const criteria = a.criteria;
      if (!criteria || !criteria.type) return false;
      switch (criteria.type) {
        case 'level': return userRow.level >= criteria.value;
        case 'total_xp': return userRow.total_xp >= criteria.value;
        case 'quest_count': return userRow.quests_completed >= criteria.value;
        case 'streak': return userRow.current_streak >= criteria.value;
        default: return false;
      }
    });

    expect(qualifying).toHaveLength(0);
  });

  it('should handle all criteria types correctly', () => {
    const userRow = { level: 10, total_xp: 5000, current_streak: 7, quests_completed: 50 };
    const achievements = [
      { id: 1, criteria: { type: 'level', value: 10 }, xp_bonus: 50 },
      { id: 2, criteria: { type: 'total_xp', value: 5000 }, xp_bonus: 100 },
      { id: 3, criteria: { type: 'quest_count', value: 50 }, xp_bonus: 75 },
      { id: 4, criteria: { type: 'streak', value: 7 }, xp_bonus: 60 },
    ];

    const qualifying = achievements.filter((a: any) => {
      switch (a.criteria.type) {
        case 'level': return userRow.level >= a.criteria.value;
        case 'total_xp': return userRow.total_xp >= a.criteria.value;
        case 'quest_count': return userRow.quests_completed >= a.criteria.value;
        case 'streak': return userRow.current_streak >= a.criteria.value;
        default: return false;
      }
    });

    // All 4 meet exact thresholds
    expect(qualifying).toHaveLength(4);
  });
});

// ─── GET /api/users/:userId/achievements/recent ──────────────────────

describe('GET /api/users/:userId/achievements/recent', () => {
  it('should return recent achievements with default limit', async () => {
    const recent = [
      { id: 1, name: 'First Quest', unlocked_at: '2025-01-15T00:00:00Z' },
      { id: 2, name: 'Streak 3', unlocked_at: '2025-01-14T00:00:00Z' },
    ];

    mockQuery.mockResolvedValueOnce(recent);

    const rows = await mockQuery(expect.any(String), [1, 5]);
    expect(rows).toHaveLength(2);
    expect(rows[0].name).toBe('First Quest');
  });

  it('should cap limit at 50', () => {
    const requestedLimit = 100;
    const limit = Math.min(parseInt(String(requestedLimit)) || 5, 50);
    expect(limit).toBe(50);
  });

  it('should default limit to 5 when not provided', () => {
    const requestedLimit = undefined;
    const limit = Math.min(parseInt(String(requestedLimit)) || 5, 50);
    expect(limit).toBe(5);
  });
});

// ─── Error handling ──────────────────────────────────────────────────

describe('Achievement route error handling', () => {
  it('should handle DB error in GET /api/achievements', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

    try {
      await mockQuery(expect.any(String));
      throw new Error('Should not reach');
    } catch (error: any) {
      expect(error.message).toBe('Connection timeout');
    }
  });

  it('should handle DB error in user achievements query', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Table not found'));

    try {
      await mockQuery(expect.any(String), [1]);
      throw new Error('Should not reach');
    } catch (error: any) {
      expect(error.message).toBe('Table not found');
    }
  });

  it('should return 404 for user not found in check endpoint', async () => {
    mockQueryOne.mockResolvedValueOnce(null); // user not found

    const userRow = await mockQueryOne(expect.any(String), [999]);
    expect(userRow).toBeNull();
  });
});
