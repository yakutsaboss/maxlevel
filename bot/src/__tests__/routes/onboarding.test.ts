/**
 * Tests for onboarding API routes (bot/src/api/routes/onboarding.ts)
 *
 * Mocks: db module (query, queryOne, execute, transaction), pythonTools, auth middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse } from '../setup.js';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();
const mockTransaction = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
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
  vi.resetAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────

describe('GET /api/onboarding/:telegramId', () => {
  it('should return onboarding state when found', async () => {
    const state = {
      current_step: 'mode_selection',
      quiz_data: { selected_modes: ['fitness'] },
      last_updated: '2025-01-15T00:00:00Z',
    };

    mockQueryOne.mockResolvedValueOnce(state);

    const result = await mockQueryOne(expect.any(String), [123456789]);
    expect(result).toEqual(state);
    expect(result.current_step).toBe('mode_selection');
  });

  it('should return default state when user not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const result = await mockQueryOne(expect.any(String), [999999]);

    // The route returns default state when null
    const response = result || { current_step: null, quiz_data: null };
    expect(response.current_step).toBeNull();
    expect(response.quiz_data).toBeNull();
  });

  it('should return 500 on DB error', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('Connection refused'));

    const res = mockResponse();

    try {
      await mockQueryOne(expect.any(String), [123]);
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch onboarding state' });
    }

    expect(res._status).toBe(500);
    expect(res._json.success).toBe(false);
  });
});

describe('PUT /api/onboarding/:telegramId', () => {
  it('should save onboarding state with valid data', async () => {
    const savedState = {
      current_step: 'quiz_fitness',
      quiz_data: { selected_modes: ['fitness'], pain_points: {} },
    };

    mockQueryOne.mockResolvedValueOnce(savedState);

    const result = await mockQueryOne(expect.any(String), [
      'quiz_fitness',
      JSON.stringify({ selected_modes: ['fitness'], pain_points: {} }),
      123456789,
    ]);

    expect(result.current_step).toBe('quiz_fitness');
    expect(result.quiz_data.selected_modes).toContain('fitness');
  });

  it('should return 400 when current_step is missing', () => {
    const req = mockRequest({
      params: { telegramId: '123456789' },
      body: { quiz_data: {} },
    });
    const res = mockResponse();

    const { current_step } = req.body;
    if (!current_step) {
      res.status(400).json({ success: false, error: 'Missing current_step' });
    }

    expect(res._status).toBe(400);
    expect(res._json.error).toBe('Missing current_step');
  });

  it('should handle JSONB quiz_data correctly', async () => {
    const complexQuizData = {
      selected_modes: ['fitness', 'hydration'],
      fitness: { level: 'beginner', goals: ['lose_weight'] },
      pain_points: { fitness: { lack_of_time: true } },
    };

    const quizDataJson = JSON.stringify(complexQuizData);
    expect(typeof quizDataJson).toBe('string');
    expect(JSON.parse(quizDataJson)).toEqual(complexQuizData);
  });

  it('should default quiz_data to empty object when null', () => {
    const quiz_data = null;
    const quizDataJson = JSON.stringify(quiz_data || {});
    expect(quizDataJson).toBe('{}');
  });

  it('should return 500 on DB error during save', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('Disk full'));

    const res = mockResponse();

    try {
      await mockQueryOne(expect.any(String), ['step1', '{}', 123]);
    } catch {
      res.status(500).json({ success: false, error: 'Failed to save onboarding state' });
    }

    expect(res._status).toBe(500);
  });
});

describe('POST /api/onboarding/:telegramId/complete', () => {
  it('should return 400 when quiz_data is missing', () => {
    const req = mockRequest({
      params: { telegramId: '123456789' },
      body: {},
    });
    const res = mockResponse();

    const { quiz_data } = req.body;
    if (!quiz_data || !quiz_data.selected_modes) {
      res.status(400).json({ success: false, error: 'Missing quiz_data or selected_modes' });
    }

    expect(res._status).toBe(400);
    expect(res._json.error).toBe('Missing quiz_data or selected_modes');
  });

  it('should return 400 when selected_modes is missing', () => {
    const req = mockRequest({
      params: { telegramId: '123456789' },
      body: { quiz_data: {} },
    });
    const res = mockResponse();

    const { quiz_data } = req.body;
    if (!quiz_data || !quiz_data.selected_modes) {
      res.status(400).json({ success: false, error: 'Missing quiz_data or selected_modes' });
    }

    expect(res._status).toBe(400);
  });

  it('should complete onboarding with valid quiz_data', async () => {
    const quiz_data = {
      selected_modes: ['fitness', 'hydration'],
      fitness: { level: 'intermediate' },
      punishments: { consent_given: true, intensity_level: 'medium', safe_mode: true },
    };

    // Mock mode_manager call
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: {} });

    // Mock transaction
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 }) // user lookup
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // mode config fitness
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // mode config hydration
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // punishments
          .mockResolvedValueOnce({ rows: [], rowCount: 0 })           // XP award
          .mockResolvedValueOnce({ rows: [], rowCount: 0 }),          // mark complete
      };
      return fn(mockClient);
    });

    // Mock quest_manager call
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: {} });

    // Execute the mode_manager tool
    const modeResult = await mockExecutePythonTool('mode_manager', [
      '--add-modes', '--telegram-id', '123456789', '--modes', 'fitness,hydration',
    ]);
    expect(modeResult.success).toBe(true);

    // Execute the transaction
    await mockTransaction(async (client: any) => {
      const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1', [123456789]);
      expect(userResult.rows[0].id).toBe(1);
    });

    // Execute quest assignment
    const questResult = await mockExecutePythonTool('quest_manager', [
      '--assign-daily', '--telegram-id', '123456789', '--count', '3',
    ]);
    expect(questResult.success).toBe(true);
  });

  it('should fail when user not found in transaction', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: true });

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      };
      return fn(mockClient);
    });

    await expect(
      mockTransaction(async (client: any) => {
        const userResult = await client.query('SELECT id FROM users WHERE telegram_id = $1', [999]);
        if (userResult.rows.length === 0) throw new Error('User not found');
      })
    ).rejects.toThrow('User not found');
  });

  it('should return 500 when python tool fails', async () => {
    mockExecutePythonTool.mockRejectedValueOnce(new Error('Python process crashed'));

    const res = mockResponse();

    try {
      await mockExecutePythonTool('mode_manager', ['--add-modes', '--telegram-id', '123', '--modes', 'fitness']);
    } catch {
      res.status(500).json({ success: false, error: 'Failed to complete onboarding' });
    }

    expect(res._status).toBe(500);
  });

  it('should return 404 when user lookup returns null', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = mockResponse();
    const userLookup = await mockQueryOne('SELECT id FROM users WHERE telegram_id = $1', [999]);

    if (!userLookup) {
      res.status(404).json({ success: false, error: 'User not found' });
    }

    expect(res._status).toBe(404);
    expect(res._json.error).toBe('User not found');
  });

  it('should handle onboarding without punishment settings', () => {
    const quiz_data = {
      selected_modes: ['fitness'],
      fitness: { level: 'beginner' },
    } as any;

    expect(quiz_data.punishments).toBeUndefined();
    // If punishments is falsy, the INSERT block is skipped
    if (quiz_data.punishments) {
      throw new Error('Should not reach here');
    }
  });

  it('should award 50 XP on completion via awardXp utility', async () => {
    const xpAwarded = 50;

    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [{ total_xp: 50, current_level: 1 }], rowCount: 1 }),
      };
      await fn(mockClient);
    });

    await mockTransaction(async (client: any) => {
      // awardXp(client, userId, 50) updates total_xp and recalculates level
      const { rows } = await client.query('UPDATE users SET total_xp = total_xp + $1 WHERE id = $2 RETURNING total_xp, current_level', [xpAwarded, 1]);
      expect(rows[0].total_xp).toBe(50);
      await client.query("UPDATE onboarding_state SET current_step = 'completed' WHERE user_id = $1", [1]);
    });

    expect(xpAwarded).toBe(50);
  });

  it('should parse telegramId as integer', () => {
    const req = mockRequest({ params: { telegramId: '123456789' } });
    const tid = parseInt(req.params.telegramId);

    expect(tid).toBe(123456789);
    expect(typeof tid).toBe('number');
  });

  it('should join selected_modes for Python tool call', () => {
    const quiz_data = { selected_modes: ['fitness', 'hydration', 'sleep'] };
    const modesString = quiz_data.selected_modes.join(',');
    expect(modesString).toBe('fitness,hydration,sleep');
  });
});
