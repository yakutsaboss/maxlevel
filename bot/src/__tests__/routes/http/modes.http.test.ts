/**
 * HTTP integration tests for mode routes (bot/src/api/routes/modes.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from '../../helpers/testApp.js';

// ─── Mocks (hoisted before any route import) ───────────────────────

const mockQuery = vi.fn();
const mockQueryOne = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: (...args: any[]) => mockQueryOne(...args),
  execute: (...args: any[]) => mockExecute(...args),
  transaction: vi.fn(),
  getPool: vi.fn(),
}));

vi.mock('../../../utils/cache.js', () => ({
  cached: vi.fn(async (_k: string, _t: number, fn: () => Promise<any>) => fn()),
  invalidate: vi.fn(),
  invalidatePrefix: vi.fn(),
  invalidateUserCache: vi.fn(),
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
}));

vi.mock('../../../api/middleware/rateLimiter.js', () => ({
  apiLimiter: (_req: any, _res: any, next: any) => next(),
  mutationLimiter: (_req: any, _res: any, next: any) => next(),
  readLimiter: (_req: any, _res: any, next: any) => next(),
}));

// ─── Import router after mocks ─────────────────────────────────────

import { modeRouter } from '../../../api/routes/modes.js';

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/modes', modeRouter);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/modes', () => {
  it('should return 200 with all available modes', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
      { id: 2, name: 'hydration', display_name: 'Hydration', description: 'Drink water', icon: '💧' },
    ]);

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(200);

    expect(res.body.modes).toHaveLength(2);
    expect(res.body.count).toBe(2);
    expect(res.body.modes[0].name).toBe('fitness');
  });

  it('should return empty array when no modes exist', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(200);

    expect(res.body.modes).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('GET /api/modes/users/:userId', () => {
  it('should return 200 with user active modes', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, user_id: 42, mode_id: 1, is_active: true, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
    ]);

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(200);

    expect(res.body.modes).toHaveLength(1);
    expect(res.body.count).toBe(1);
    expect(res.body.modes[0].name).toBe('fitness');
  });

  it('should return empty array for user with no active modes', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(200);

    expect(res.body.modes).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('POST /api/modes/users/:userId', () => {
  it('should return 200 when adding modes', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({
      success: true,
      data: [{ mode_id: 1 }, { mode_id: 2 }],
    });

    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: [1, 2] })
      .expect(200);

    expect(res.body.message).toBe('Modes added successfully');
    expect(mockExecutePythonTool).toHaveBeenCalledWith('mode_manager', [
      '--add-modes', '--user-id', '42', '--modes', '1,2',
    ]);
  });

  it('should return 400 when modes array is missing', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('modes');
  });

  it('should return 400 when modes is not an array', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: 'fitness' })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
  });

  it('should return 400 when modes array is empty', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: [] })
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
  });

  it('should return 500 when python tool fails', async () => {
    mockExecutePythonTool.mockResolvedValueOnce({ success: false, error: 'tool error' });

    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: [1] })
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('DELETE /api/modes/users/:userId/:modeId', () => {
  it('should return 200 when mode removed successfully', async () => {
    mockExecute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .delete('/api/modes/users/42/1')
      .expect(200);

    expect(res.body.message).toBe('Mode removed successfully');
  });

  it('should return 404 when mode not found for user', async () => {
    mockExecute.mockResolvedValueOnce(0);

    const res = await request(buildApp())
      .delete('/api/modes/users/42/999')
      .expect(404);

    expect(res.body.error).toBe('Not Found');
  });

  it('should return 500 when database throws', async () => {
    mockExecute.mockRejectedValueOnce(new Error('constraint error'));

    const res = await request(buildApp())
      .delete('/api/modes/users/42/1')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});

describe('PATCH /api/modes/users/:userId/:modeId', () => {
  it('should return 200 when settings updated', async () => {
    mockQueryOne.mockResolvedValueOnce({
      user_id: 42, mode_id: 1, settings: { reminder: true },
    });

    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({ settings: { reminder: true } })
      .expect(200);

    expect(res.body.message).toBe('Mode settings updated successfully');
  });

  it('should return 400 when settings object is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({})
      .expect(400);

    expect(res.body.error).toBe('Bad Request');
    expect(res.body.message).toContain('settings');
  });

  it('should return 404 when mode not found for user', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({ settings: { reminder: false } })
      .expect(404);

    expect(res.body.error).toBe('Not Found');
  });
});

describe('GET /api/modes/:modeId/quests', () => {
  it('should return 200 with quest templates for mode', async () => {
    mockQuery.mockResolvedValueOnce([
      { id: 1, name: 'Morning Run', description: 'Run 2km', xp_reward: 50, frequency: 'daily', difficulty: 'easy', requires_timer: false, is_mandatory: false },
    ]);

    const res = await request(buildApp())
      .get('/api/modes/1/quests')
      .expect(200);

    expect(res.body.quests).toHaveLength(1);
    expect(res.body.count).toBe(1);
    expect(res.body.quests[0].name).toBe('Morning Run');
  });

  it('should return empty array for mode with no quests', async () => {
    mockQuery.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes/999/quests')
      .expect(200);

    expect(res.body.quests).toHaveLength(0);
    expect(res.body.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/modes/1/quests')
      .expect(500);

    expect(res.body.error).toBe('Server Error');
  });
});
