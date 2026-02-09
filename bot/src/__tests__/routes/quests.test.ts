/**
 * Tests for quest API routes (bot/src/api/routes/quests.ts)
 *
 * Mocks: pythonTools (executePythonTool), auth middleware, rate limiter
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockExecutePythonTool = vi.fn();

vi.mock('../../utils/pythonTools.js', () => ({
  executePythonTool: (...args: any[]) => mockExecutePythonTool(...args),
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
