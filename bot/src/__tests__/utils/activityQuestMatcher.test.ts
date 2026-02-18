/**
 * Tests for activityQuestMatcher (bot/src/utils/activityQuestMatcher.ts)
 *
 * Tests: matching logic, category resolution, quest progression,
 * quest auto-completion, XP award, edge cases.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
}));

const mockAwardXp = vi.fn();
vi.mock('../../utils/xpAward.js', () => ({
  awardXp: (...args: any[]) => mockAwardXp(...args),
}));

vi.mock('../../utils/achievementEngine.js', () => ({
  checkAndUnlockAchievements: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../utils/streak.js', () => ({
  updateStreak: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../utils/cache.js', () => ({
  invalidateUserCache: vi.fn(),
  invalidatePrefix: vi.fn(),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

// ─── Import after mocks ───────────────────────────────────────────

import { matchActivityToQuests, type ActivityLogInput, type QuestMatchResult } from '../../utils/activityQuestMatcher.js';

// ─── Test data ────────────────────────────────────────────────────

const ACTIVE_QUEST = {
  instance_id: 10,
  quest_id: 5,
  status: 'ready',
  check_in_count: 0,
  target: 3,
  xp_reward: 50,
  mode_id: 2,
  title: 'Morning Run Challenge',
};

const ACTIVITY_LOG: ActivityLogInput = {
  id: 42,
  activity_type_id: 1,
  category: 'Cardio',
};

// ─── Tests ────────────────────────────────────────────────────────

describe('matchActivityToQuests', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns default result when no active fitness quests', async () => {
    // No quests found
    mockQuery.mockResolvedValueOnce([]);

    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    expect(result.questsProgressed).toBe(0);
    expect(result.questsCompleted).toBe(0);
    expect(result.totalXpAwarded).toBe(0);
    expect(result.leveledUp).toBe(false);
    expect(result.newLevel).toBeNull();
  });

  it('resolves category from DB when not provided in input', async () => {
    // Category lookup
    mockQuery
      .mockResolvedValueOnce([{ category: 'Strength' }]) // category lookup
      .mockResolvedValueOnce([]); // no active quests

    const logWithoutCategory: ActivityLogInput = {
      id: 42,
      activity_type_id: 1,
      // no category
    };

    await matchActivityToQuests(1, logWithoutCategory);

    // Should have queried activity_types for category
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('SELECT category FROM activity_types'),
      [1],
    );
  });

  it('returns empty result when category is not fitness-related', async () => {
    // Imagine a non-fitness category that doesn't exist in FITNESS_CATEGORIES
    const logNonFitness: ActivityLogInput = {
      id: 42,
      activity_type_id: 1,
      category: 'Academic', // not in FITNESS_CATEGORIES
    };

    const result = await matchActivityToQuests(1, logNonFitness);

    expect(result.questsProgressed).toBe(0);
    expect(mockQuery).not.toHaveBeenCalled(); // should return early before querying quests
  });

  it('increments quest progress without completing when under target', async () => {
    const quest = { ...ACTIVE_QUEST, check_in_count: 0, target: 3 };
    mockQuery
      .mockResolvedValueOnce([quest]) // active quests
      .mockResolvedValueOnce([]); // UPDATE query

    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    expect(result.questsProgressed).toBe(1);
    expect(result.questsCompleted).toBe(0);
    expect(result.totalXpAwarded).toBe(0);

    // Should have updated check_in_count to 1 and status to 'in_progress'
    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining("status = 'in_progress'"),
      [1, quest.instance_id],
    );
  });

  it('auto-completes quest and awards XP when target reached', async () => {
    const quest = { ...ACTIVE_QUEST, check_in_count: 2, target: 3, xp_reward: 100 };
    mockQuery.mockResolvedValueOnce([quest]); // active quests

    mockTransaction.mockImplementation(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      mockAwardXp.mockResolvedValueOnce({
        totalXp: 500,
        newLevel: 2,
        oldLevel: 1,
        leveledUp: true,
      });
      return fn(mockClient);
    });

    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    expect(result.questsProgressed).toBe(1);
    expect(result.questsCompleted).toBe(1);
    expect(result.totalXpAwarded).toBe(100);
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBe(2);
  });

  it('progresses multiple quests in one activity', async () => {
    const quest1 = { ...ACTIVE_QUEST, instance_id: 10, check_in_count: 0, target: 5 };
    const quest2 = { ...ACTIVE_QUEST, instance_id: 11, check_in_count: 4, target: 5, xp_reward: 75 };

    // quest2 is at 4/5, will complete with this activity
    mockQuery
      .mockResolvedValueOnce([quest1, quest2]) // active quests (ordered by check_in_count ASC)
      .mockResolvedValueOnce([]); // UPDATE for quest1

    mockTransaction.mockImplementation(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      mockAwardXp.mockResolvedValueOnce({
        totalXp: 575,
        newLevel: 2,
        oldLevel: 2,
        leveledUp: false,
      });
      return fn(mockClient);
    });

    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    expect(result.questsProgressed).toBe(2);
    expect(result.questsCompleted).toBe(1);
    expect(result.totalXpAwarded).toBe(75);
  });

  it('handles all fitness categories correctly', async () => {
    const categories = ['Cardio', 'Strength', 'Flexibility', 'Sports', 'Outdoor', 'Mind-Body'];

    for (const category of categories) {
      vi.resetAllMocks();
      mockQuery.mockResolvedValueOnce([]); // no active quests

      const log: ActivityLogInput = { id: 1, activity_type_id: 1, category };
      const result = await matchActivityToQuests(1, log);

      // Should have queried for active quests (not returned early)
      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(result.questsProgressed).toBe(0);
    }
  });

  it('handles errors gracefully without throwing', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection failed'));

    // Should NOT throw — error is caught internally
    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    expect(result.questsProgressed).toBe(0);
    expect(result.questsCompleted).toBe(0);
    expect(result.totalXpAwarded).toBe(0);
  });

  it('handles quest with target=0 (defaults to 1)', async () => {
    const quest = { ...ACTIVE_QUEST, check_in_count: 0, target: 0, xp_reward: 25 };
    mockQuery.mockResolvedValueOnce([quest]);

    mockTransaction.mockImplementation(async (fn: any) => {
      const mockClient = { query: vi.fn().mockResolvedValue({ rows: [] }) };
      mockAwardXp.mockResolvedValueOnce({
        totalXp: 25,
        newLevel: 1,
        oldLevel: 1,
        leveledUp: false,
      });
      return fn(mockClient);
    });

    const result = await matchActivityToQuests(1, ACTIVITY_LOG);

    // target defaults to 1, so count goes 0→1 which meets target
    expect(result.questsCompleted).toBe(1);
  });

  it('does not re-query category when provided in input', async () => {
    mockQuery.mockResolvedValueOnce([]); // active quests only

    await matchActivityToQuests(1, { id: 1, activity_type_id: 1, category: 'Cardio' });

    // Should NOT have queried activity_types for category
    expect(mockQuery).not.toHaveBeenCalledWith(
      expect.stringContaining('SELECT category FROM activity_types'),
      expect.anything(),
    );
  });
});
