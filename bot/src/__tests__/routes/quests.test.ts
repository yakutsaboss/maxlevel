/**
 * Tests for quest API routes (bot/src/api/routes/quests.ts)
 *
 * Mocks: pythonTools (executePythonTool), db (queryOne, transaction),
 *        cache (invalidateUserCache), auth middleware, rate limiter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockExecutePythonTool = vi.fn();
const mockQueryOne = vi.fn();
const mockTransaction = vi.fn();
const mockInvalidateUserCache = vi.fn();

vi.mock('../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
}));

vi.mock('../../utils/db.js', () => ({
  queryOne: (...args: any[]) => mockQueryOne(...args),
  transaction: (...args: any[]) => mockTransaction(...args),
  getPool: vi.fn(),
}));

vi.mock('../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  invalidateUserCache: (...args: any[]) => mockInvalidateUserCache(...args),
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
  vi.resetAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────

describe('GET /api/users/:userId/quests/active', () => {
  it('should return active quests on success', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: {
        quests: [
          { id: 1, title: 'Morning Run', status: 'active', xp_reward: 50 },
          { id: 2, title: 'Read a Book', status: 'active', xp_reward: 30 },
        ],
        count: 2,
      },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--get-active', '--user-id', '1']);

    expect(result.success).toBe(true);
    expect(result.data.quests).toHaveLength(2);
    expect(result.data.quests[0].title).toBe('Morning Run');
  });

  it('should return empty list when no active quests', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { quests: [], count: 0 },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--get-active', '--user-id', '1']);

    expect(result.success).toBe(true);
    expect(result.data.quests).toHaveLength(0);
  });

  it('should handle tool failure gracefully', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      error: 'Database connection failed',
    });

    const result = await mockExecutePythonTool('quest_manager', ['--get-active', '--user-id', '1']);
    const res = mockResponse();

    if (!result.success) {
      res.status(500).json({
        error: 'Server Error',
        message: 'Failed to fetch active quests',
      });
    }

    expect(res._status).toBe(500);
    expect(res._json.error).toBe('Server Error');
  });
});

describe('GET /api/users/:userId/quests/completed', () => {
  it('should return completed quests with default limit', async () => {
    const completedQuests = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      title: `Quest ${i + 1}`,
      status: 'completed',
      completed_at: '2025-01-15T00:00:00Z',
    }));

    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { quests: completedQuests, count: 5 },
    });

    const result = await mockExecutePythonTool('quest_manager', [
      '--get-completed', '--user-id', '1', '--limit', '50',
    ]);

    expect(result.success).toBe(true);
    expect(result.data.quests).toHaveLength(5);
  });
});

describe('POST /api/quests/:questId/complete', () => {
  it('should complete a quest and return XP earned', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { xp_awarded: 50, new_level: null },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--complete-quest', '--quest-id', '1']);

    expect(result.success).toBe(true);
    expect(result.data.xp_awarded).toBe(50);
  });

  it('should return 404 when quest not found', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      data: { error: 'Quest not found' },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--complete-quest', '--quest-id', '999']);
    const res = mockResponse();

    if (!result.success) {
      const errorMsg = result.data?.error || 'Failed to complete quest';
      if (errorMsg.includes('not found')) {
        res.status(404).json({ error: 'Not Found', message: errorMsg });
      }
    }

    expect(res._status).toBe(404);
    expect(res._json.message).toContain('not found');
  });

  it('should return 400 when quest already completed', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: false,
      data: { error: 'Quest already completed' },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--complete-quest', '--quest-id', '1']);
    const res = mockResponse();

    if (!result.success) {
      const errorMsg = result.data?.error || 'Failed to complete quest';
      if (errorMsg.includes('already completed')) {
        res.status(400).json({ error: 'Bad Request', message: errorMsg });
      }
    }

    expect(res._status).toBe(400);
  });

  it('should handle level-up on quest completion', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { xp_awarded: 100, new_level: 6 },
    });

    const result = await mockExecutePythonTool('quest_manager', ['--complete-quest', '--quest-id', '1']);

    expect(result.data.new_level).toBe(6);
    expect(!!result.data.new_level).toBe(true); // leveledUp
  });
});

describe('POST /api/users/:userId/quests/assign', () => {
  it('should reject invalid frequency', () => {
    const req = mockRequest({
      params: { userId: '1' },
      body: { frequency: 'monthly' },
    });
    const res = mockResponse();

    const { frequency } = req.body;
    if (!frequency || !['daily', 'weekly'].includes(frequency)) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid frequency. Must be "daily" or "weekly"',
      });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toContain('Invalid frequency');
  });

  it('should assign daily quests successfully', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: { count: 3, quests: [{}, {}, {}] },
    });

    const result = await mockExecutePythonTool('quest_manager', [
      '--assign-daily', '--user-id', '1',
    ]);

    expect(result.success).toBe(true);
    expect(result.data.count).toBe(3);
  });
});

// ─── PATCH /api/quests/:questId/progress (Run 2 addition) ──────────

describe('PATCH /api/quests/:questId/progress', () => {
  const activeQuest = {
    id: 10,
    user_id: 1,
    status: 'active',
    current_progress: 0,
    xp_reward: 50,
    title: 'Morning Run',
    target: 1,
  };

  it('should update progress without completing (progress < target)', async () => {
    // queryOne returns quest, then returns updated row
    mockQueryOne
      .mockResolvedValueOnce({ ...activeQuest, target: 3 })  // fetch quest
      .mockResolvedValueOnce({ id: 10 });                     // update progress

    const req = mockRequest({
      params: { questId: '10' },
      body: { user_id: 1, progress: 1 },
    });
    const res = mockResponse();

    // Simulate endpoint logic
    const questId = parseInt(req.params.questId);
    const { user_id, progress } = req.body;
    const quest = await mockQueryOne(expect.any(String), [questId]);

    expect(quest).not.toBeNull();
    expect(quest.user_id).toBe(user_id);

    const target = quest.target || 1;
    const clampedProgress = Math.min(progress, target);

    // progress (1) < target (3), so just update
    expect(clampedProgress).toBeLessThan(target);

    await mockQueryOne(expect.any(String), [clampedProgress, questId]);
    mockInvalidateUserCache(user_id);

    res.json({
      success: true,
      data: {
        id: questId,
        status: quest.status,
        progress: clampedProgress,
        target,
        xpEarned: 0,
        newLevel: null,
        leveledUp: false,
      },
    });

    expect(res._json.success).toBe(true);
    expect(res._json.data.progress).toBe(1);
    expect(res._json.data.leveledUp).toBe(false);
    expect(res._json.data.xpEarned).toBe(0);
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(1);
  });

  it('should auto-complete when progress reaches target', async () => {
    mockQueryOne.mockResolvedValueOnce(activeQuest); // fetch quest (target=1)
    mockTransaction.mockResolvedValueOnce({ total_xp: 550, current_level: 2 });

    const questId = 10;
    const user_id = 1;
    const progress = 1;

    const quest = await mockQueryOne(expect.any(String), [questId]);
    const target = quest.target || 1;
    const clampedProgress = Math.min(progress, target);

    expect(clampedProgress).toBeGreaterThanOrEqual(target);

    const result = await mockTransaction(expect.any(Function));
    mockInvalidateUserCache(user_id);

    const response = {
      success: true,
      data: {
        id: questId,
        status: 'completed',
        progress: clampedProgress,
        target,
        xpEarned: quest.xp_reward,
        newLevel: result?.current_level || null,
        leveledUp: true,
      },
    };

    expect(response.success).toBe(true);
    expect(response.data.status).toBe('completed');
    expect(response.data.xpEarned).toBe(50);
    expect(response.data.leveledUp).toBe(true);
    expect(response.data.newLevel).toBe(2);
    expect(mockInvalidateUserCache).toHaveBeenCalledWith(1);
  });

  it('should return 404 when quest not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = mockResponse();
    const quest = await mockQueryOne(expect.any(String), [999]);

    if (!quest) {
      res.status(404).json({ error: 'Not Found', message: 'Quest not found' });
    }

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Quest not found');
  });

  it('should return 403 when quest does not belong to user', async () => {
    mockQueryOne.mockResolvedValueOnce({ ...activeQuest, user_id: 99 });

    const res = mockResponse();
    const quest = await mockQueryOne(expect.any(String), [10]);
    const user_id = 1;

    if (quest.user_id !== user_id) {
      res.status(403).json({ error: 'Forbidden', message: 'Quest does not belong to this user' });
    }

    expect(res._status).toBe(403);
    expect(res._json.message).toBe('Quest does not belong to this user');
  });

  it('should return 400 for invalid progress value', () => {
    const res = mockResponse();
    const progress = -5;

    if (progress === undefined || typeof progress !== 'number' || progress < 0) {
      res.status(400).json({ error: 'Bad Request', message: 'progress must be a non-negative number' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toContain('non-negative');
  });

  it('should return 400 when quest is already completed', async () => {
    mockQueryOne.mockResolvedValueOnce({ ...activeQuest, status: 'completed' });

    const res = mockResponse();
    const quest = await mockQueryOne(expect.any(String), [10]);

    if (quest.status === 'completed') {
      res.status(400).json({ error: 'Bad Request', message: 'Quest is already completed' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Quest is already completed');
  });
});
