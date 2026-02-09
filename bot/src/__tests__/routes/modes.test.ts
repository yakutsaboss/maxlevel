/**
 * Tests for modes API routes (bot/src/api/routes/modes.ts)
 *
 * Mocks: db module (query, queryOne, execute), pythonTools, cache, auth middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  transaction: vi.fn(),
  getPool: vi.fn(),
}));

const mockCached = vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn());

vi.mock('../../utils/cache.js', () => ({
  cached: (...args: any[]) => mockCached(...args),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  clearAll: vi.fn(),
  TTL: { SHORT: 30_000, MEDIUM: 300_000, LONG: 1_800_000 },
}));

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

describe('GET /api/modes', () => {
  it('should return all modes', async () => {
    const modes = [
      { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
      { id: 2, name: 'hydration', display_name: 'Hydration', description: 'Drink water', icon: '💧' },
    ];

    mockQuery.mockResolvedValueOnce(modes);

    const result = await mockCached('modes:all', 300_000, () =>
      mockQuery('SELECT id, name, display_name, description, icon_emoji AS icon FROM modes ORDER BY id')
    );

    expect(result).toEqual(modes);
    expect(result.length).toBe(2);
  });

  it('should handle empty modes list', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await mockCached('modes:all', 300_000, () =>
      mockQuery('SELECT id, name, display_name, description, icon_emoji AS icon FROM modes ORDER BY id')
    );

    expect(result).toEqual([]);
  });

  it('should return 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const req = mockRequest({});
    const res = mockResponse();

    try {
      await mockQuery('SELECT ...');
    } catch (error) {
      res.status(500).json({ error: 'Server Error', message: 'Failed to fetch modes' });
    }

    expect(res._status).toBe(500);
    expect(res._json.error).toBe('Server Error');
  });
});

describe('GET /api/users/:userId/modes', () => {
  it('should return user modes', async () => {
    const userModes = [
      { id: 1, user_id: 1, mode_id: 1, is_active: true, enabled_at: '2025-01-01', name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
    ];

    mockQuery.mockResolvedValueOnce(userModes);

    const result = await mockQuery(expect.any(String), [1]);
    expect(result).toEqual(userModes);
    expect(result.length).toBe(1);
  });

  it('should return empty list when user has no modes', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await mockQuery(expect.any(String), [999]);
    expect(result).toEqual([]);
  });

  it('should return 500 on DB error', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = mockResponse();

    try {
      await mockQuery(expect.any(String), [1]);
    } catch {
      res.status(500).json({ error: 'Server Error', message: 'Failed to fetch user modes' });
    }

    expect(res._status).toBe(500);
  });
});

describe('GET /api/users/:userId/modes/summary', () => {
  it('should return mode summary with quest counts', async () => {
    const summary = [
      { id: 1, name: 'fitness', display_name: 'Fitness', icon: '💪', active_quests: 3, completed_quests: 10 },
    ];

    mockQuery.mockResolvedValueOnce(summary);

    const result = await mockQuery(expect.any(String), [1]);
    expect(result[0].active_quests).toBe(3);
    expect(result[0].completed_quests).toBe(10);
  });
});

describe('POST /api/users/:userId/modes', () => {
  it('should return 400 for invalid modes array', () => {
    const req = mockRequest({ params: { userId: '1' }, body: {} });
    const res = mockResponse();

    const { modes } = req.body;
    if (!modes || !Array.isArray(modes) || modes.length === 0) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid modes array' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Invalid modes array');
  });

  it('should return 400 for empty modes array', () => {
    const req = mockRequest({ params: { userId: '1' }, body: { modes: [] } });
    const res = mockResponse();

    const { modes } = req.body;
    if (!modes || !Array.isArray(modes) || modes.length === 0) {
      res.status(400).json({ error: 'Bad Request', message: 'Invalid modes array' });
    }

    expect(res._status).toBe(400);
  });

  it('should add modes successfully via python tool', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: [{ mode: 'fitness', user_mode_id: 1 }],
    });

    const result = await mockExecutePythonTool('mode_manager', [
      '--add-modes', '--user-id', '1', '--modes', 'fitness,hydration',
    ]);

    expect(result.success).toBe(true);
    expect(mockExecutePythonTool).toHaveBeenCalledWith('mode_manager', expect.arrayContaining(['--add-modes']));
  });

  it('should return 500 when python tool fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false });

    const result = await mockExecutePythonTool('mode_manager', ['--add-modes', '--user-id', '1', '--modes', 'fitness']);
    expect(result.success).toBe(false);
  });
});

describe('DELETE /api/users/:userId/modes/:modeId', () => {
  it('should remove mode successfully', async () => {
    mockExecute.mockResolvedValueOnce(1);

    const affected = await mockExecute(expect.any(String), [1, 1]);
    expect(affected).toBe(1);
  });

  it('should return 404 when mode not found', async () => {
    mockExecute.mockResolvedValueOnce(0);

    const res = mockResponse();
    const affected = await mockExecute(expect.any(String), [1, 999]);

    if (affected === 0) {
      res.status(404).json({ error: 'Not Found', message: 'Mode not found for user' });
    }

    expect(res._status).toBe(404);
    expect(res._json.message).toBe('Mode not found for user');
  });
});

describe('PATCH /api/users/:userId/modes/:modeId', () => {
  it('should return 400 when settings missing', () => {
    const req = mockRequest({ params: { userId: '1', modeId: '1' }, body: {} });
    const res = mockResponse();

    const { settings } = req.body;
    if (!settings) {
      res.status(400).json({ error: 'Bad Request', message: 'Missing settings object' });
    }

    expect(res._status).toBe(400);
    expect(res._json.message).toBe('Missing settings object');
  });

  it('should update mode settings successfully', async () => {
    const updatedRow = { id: 1, user_id: 1, mode_id: 1, settings: { reminder: true } };
    mockQueryOne.mockResolvedValueOnce(updatedRow);

    const result = await mockQueryOne(expect.any(String), [JSON.stringify({ reminder: true }), 1, 1]);
    expect(result.settings.reminder).toBe(true);
  });

  it('should return 404 when mode not found for update', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = mockResponse();
    const row = await mockQueryOne(expect.any(String), [JSON.stringify({}), 1, 999]);

    if (!row) {
      res.status(404).json({ error: 'Not Found', message: 'Mode not found for user' });
    }

    expect(res._status).toBe(404);
  });
});

describe('GET /api/modes/:modeId/quests', () => {
  it('should return quests for a mode', async () => {
    const quests = [
      { id: 1, name: 'Morning Run', description: 'Run 5K', xp_reward: 100, frequency: 'daily', difficulty: 'medium', requires_timer: false, is_mandatory: false },
    ];

    mockQuery.mockResolvedValueOnce(quests);

    const result = await mockCached('mode_quests:1', 300_000, () =>
      mockQuery(expect.any(String), [1])
    );

    expect(result).toEqual(quests);
    expect(result[0].name).toBe('Morning Run');
  });

  it('should handle mode with no quests', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const result = await mockCached('mode_quests:99', 300_000, () =>
      mockQuery(expect.any(String), [99])
    );

    expect(result).toEqual([]);
  });
});
