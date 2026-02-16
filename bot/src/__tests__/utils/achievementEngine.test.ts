/**
 * Tests for Achievement Engine (bot/src/utils/achievementEngine.ts)
 *
 * Tests: criteria evaluation, unlock flow, XP bonus, cache invalidation, error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
}));

const mockInvalidateUserCache = vi.fn();
vi.mock('../../utils/cache.js', () => ({
  invalidateUserCache: (...args: any[]) => mockInvalidateUserCache(...args),
}));

const mockAwardXp = vi.fn();
vi.mock('../../utils/xpAward.js', () => ({
  awardXp: (...args: any[]) => mockAwardXp(...args),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { checkAndUnlockAchievements } from '../../utils/achievementEngine.js';

// ─── Helpers ────────────────────────────────────────────────────────

const userRow = {
  level: 5,
  total_xp: 2500,
  current_streak: 7,
  quests_completed: 20,
};

function makeAchievement(id: number, criteria: Record<string, any>, xp_bonus = 50) {
  return {
    id,
    name: `Achievement ${id}`,
    description: `Desc ${id}`,
    criteria,
    xp_bonus,
    icon: '🏆',
    rarity: 'common',
  };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('checkAndUnlockAchievements', () => {
  it('returns unlocked achievements for a qualifying user (level-based)', async () => {
    const achievement = makeAchievement(1, { type: 'level', value: 5 }, 100);

    // queryOne → user stats; query → available achievements
    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    // transaction: simulate INSERT RETURNING a row
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }),
      };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(1);
  });

  it('returns empty array when no achievements qualify', async () => {
    // User at level 2 — achievement requires level 10
    const lowUser = { level: 2, total_xp: 500, current_streak: 1, quests_completed: 3 };
    const achievement = makeAchievement(1, { type: 'level', value: 10 });

    mockQueryOne.mockResolvedValueOnce(lowUser);
    mockQuery.mockResolvedValueOnce([achievement]);

    const result = await checkAndUnlockAchievements(1);

    expect(result).toEqual([]);
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockInvalidateUserCache).not.toHaveBeenCalled();
  });

  it('returns empty array when user is not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);
    mockQuery.mockResolvedValueOnce([]);

    const result = await checkAndUnlockAchievements(999);

    expect(result).toEqual([]);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('handles multiple achievement types (level, total_xp, quest_count)', async () => {
    const achievements = [
      makeAchievement(1, { type: 'level', value: 5 }, 50),
      makeAchievement(2, { type: 'total_xp', value: 2000 }, 75),
      makeAchievement(3, { type: 'quest_count', value: 15 }, 100),
    ];

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce(achievements);

    // All three qualify — transaction unlocks all
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 10 }] })
          .mockResolvedValueOnce({ rows: [{ id: 11 }] })
          .mockResolvedValueOnce({ rows: [{ id: 12 }] }),
      };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);

    expect(result).toHaveLength(3);
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(1);
  });

  it('awards XP bonus when achievements are unlocked', async () => {
    const achievement = makeAchievement(1, { type: 'level', value: 3 }, 200);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }),
    };
    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await checkAndUnlockAchievements(1);

    expect(mockAwardXp).toHaveBeenCalledWith(mockClient, 1, 200);
  });

  it('does not award XP when xp_bonus is 0', async () => {
    const achievement = makeAchievement(1, { type: 'level', value: 3 }, 0);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }),
    };
    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    await checkAndUnlockAchievements(1);

    expect(mockAwardXp).not.toHaveBeenCalled();
  });

  it('skips already-unlocked achievements via ON CONFLICT DO NOTHING', async () => {
    const achievement = makeAchievement(1, { type: 'level', value: 3 }, 100);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    // INSERT returns no rows (ON CONFLICT DO NOTHING hit)
    const mockClient = {
      query: vi.fn().mockResolvedValueOnce({ rows: [] }),
    };
    mockTransaction.mockImplementationOnce(async (fn: any) => fn(mockClient));

    const result = await checkAndUnlockAchievements(1);

    // Achievement not in result because INSERT returned no rows
    expect(result).toHaveLength(0);
    expect(mockAwardXp).not.toHaveBeenCalled();
    expect(mockInvalidateUserCache).not.toHaveBeenCalled();
  });

  it('evaluates streak criteria correctly', async () => {
    // User has current_streak = 7; achievement requires 5 days
    const achievement = makeAchievement(1, { type: 'streak', days: 5 });

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 1 }] }),
      };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);

    expect(result).toHaveLength(1);
  });

  it('returns false for unknown criteria type', async () => {
    const achievement = makeAchievement(1, { type: 'unknown_type', value: 1 });

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);

    const result = await checkAndUnlockAchievements(1);

    expect(result).toEqual([]);
  });
});

// ─── Run 65: New criteria type tests ────────────────────────────────

describe('checkAndUnlockAchievements — friend_count criteria', () => {
  it('unlocks when user has enough friends', async () => {
    const achievement = makeAchievement(10, { type: 'friend_count', count: 5 }, 150);

    // 1st queryOne → user stats
    mockQueryOne.mockResolvedValueOnce(userRow);
    // query → available achievements
    mockQuery.mockResolvedValueOnce([achievement]);
    // 2nd queryOne → friend count query inside checkCriteriaMet
    mockQueryOne.mockResolvedValueOnce({ cnt: 7 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 10 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(10);
  });

  it('does not unlock when user has insufficient friends', async () => {
    const achievement = makeAchievement(10, { type: 'friend_count', count: 5 }, 150);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    // Only 2 friends, need 5
    mockQueryOne.mockResolvedValueOnce({ cnt: 2 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
    expect(mockTransaction).not.toHaveBeenCalled();
  });
});

describe('checkAndUnlockAchievements — challenge_created criteria', () => {
  it('unlocks when user has created enough challenges', async () => {
    const achievement = makeAchievement(11, { type: 'challenge_created', count: 1 }, 75);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 3 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 11 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });

  it('does not unlock when user has created no challenges', async () => {
    const achievement = makeAchievement(11, { type: 'challenge_created', count: 1 }, 75);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 0 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
  });
});

describe('checkAndUnlockAchievements — challenge_completed criteria', () => {
  it('unlocks when user has completed enough challenges', async () => {
    const achievement = makeAchievement(12, { type: 'challenge_completed', count: 5 }, 250);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 6 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 12 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });

  it('does not unlock when user has completed too few challenges', async () => {
    const achievement = makeAchievement(12, { type: 'challenge_completed', count: 5 }, 250);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 3 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
  });
});

describe('checkAndUnlockAchievements — night_quest criteria', () => {
  it('unlocks when user has completed a quest after the specified hour', async () => {
    const achievement = makeAchievement(13, { type: 'night_quest', hour: 22 }, 100);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 1 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 13 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });

  it('does not unlock when no quests completed after the hour', async () => {
    const achievement = makeAchievement(13, { type: 'night_quest', hour: 22 }, 100);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 0 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
  });
});

describe('checkAndUnlockAchievements — early_quest criteria', () => {
  it('unlocks when user has completed a quest before the specified hour', async () => {
    const achievement = makeAchievement(14, { type: 'early_quest', hour: 6 }, 100);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 1 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 14 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });
});

describe('checkAndUnlockAchievements — weekend_quests criteria', () => {
  it('unlocks when user has enough weekend quest completions', async () => {
    const achievement = makeAchievement(15, { type: 'weekend_quests', count: 10 }, 200);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 12 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 15 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });

  it('does not unlock when user has insufficient weekend quests', async () => {
    const achievement = makeAchievement(15, { type: 'weekend_quests', count: 10 }, 200);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 4 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
  });
});

describe('checkAndUnlockAchievements — all_daily_complete criteria', () => {
  it('unlocks when user has enough perfect days', async () => {
    const achievement = makeAchievement(16, { type: 'all_daily_complete', days: 7 }, 300);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 10 });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValueOnce({ rows: [{ id: 16 }] }) };
      return fn(mockClient);
    });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toHaveLength(1);
  });

  it('does not unlock when user has too few perfect days', async () => {
    const achievement = makeAchievement(16, { type: 'all_daily_complete', days: 7 }, 300);

    mockQueryOne.mockResolvedValueOnce(userRow);
    mockQuery.mockResolvedValueOnce([achievement]);
    mockQueryOne.mockResolvedValueOnce({ cnt: 3 });

    const result = await checkAndUnlockAchievements(1);
    expect(result).toEqual([]);
  });
});
