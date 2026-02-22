/**
 * HTTP integration tests for mode routes (bot/src/api/routes/modes.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle
 * including JSON parsing, status codes, and response shapes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, addTestErrorHandler } from '../../helpers/testApp.js';
import { getMockDb } from '../../helpers/httpMocks.js';

// ─── Mocks (hoisted — use async dynamic import for httpMocks) ───────

vi.mock('../../../utils/db.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockDb().module);

vi.mock('../../../utils/cache.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockCache().module);

vi.mock('../../../utils/pythonTools.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockPythonTools().module);

vi.mock('../../../api/middleware/auth.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockAuth().module);

vi.mock('../../../api/middleware/rateLimiter.js', async () =>
  (await import('../../helpers/httpMocks.js')).createMockRateLimiters().module);

// ─── Import router after mocks ─────────────────────────────────────

import { modeRouter } from '../../../api/routes/modes.js';

// ─── Mock refs (populated by vi.mock factories above) ───────────────

const db = getMockDb();

// ─── Build test app ────────────────────────────────────────────────

function buildApp() {
  const app = createTestApp();
  app.use('/api/modes', modeRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/modes', () => {
  it('should return 200 with all available modes', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
      { id: 2, name: 'hydration', display_name: 'Hydration', description: 'Drink water', icon: '💧' },
    ]);

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.modes).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.modes[0].name).toBe('fitness');
  });

  it('should return empty array when no modes exist', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(200);

    expect(res.body.data.modes).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/modes')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('GET /api/modes/users/:userId', () => {
  it('should return 200 with user active modes', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, user_id: 42, mode_id: 1, is_active: true, name: 'fitness', display_name: 'Fitness', description: 'Stay fit', icon: '💪' },
    ]);

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(200);

    expect(res.body.data.modes).toHaveLength(1);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.modes[0].name).toBe('fitness');
  });

  it('should return empty array for user with no active modes', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(200);

    expect(res.body.data.modes).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/modes/users/42')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('POST /api/modes/users/:userId', () => {
  it('should return 200 when adding modes', async () => {
    // Mock sequence for batched mode addition:
    // 1. query: batch mode lookup by name → found
    db.query.mockResolvedValueOnce([{ id: 1, name: 'fitness' }]);
    // 2. query: batch check existing user_modes → none exist
    db.query.mockResolvedValueOnce([]);
    // 3. query: batch INSERT user_modes RETURNING id, mode_id
    db.query.mockResolvedValueOnce([{ id: 100, mode_id: 1 }]);
    // 4. execute: batch INSERT streaks ON CONFLICT
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: ['fitness'] })
      .expect(200);

    expect(res.body.data.message).toBe('Modes added successfully');
    expect(res.body.data.added).toHaveLength(1);
    expect(res.body.data.added[0].mode).toBe('fitness');
  });

  it('should return 400 when modes array is missing', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({})
      .expect(400);

    expect(res.body.error).toContain('modes');
  });

  it('should return 400 when modes is not an array', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: 'fitness' })
      .expect(400);

    expect(res.body.error).toContain('modes');
  });

  it('should return 400 when modes array is empty', async () => {
    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: [] })
      .expect(400);

    expect(res.body.error).toContain('modes');
  });

  it('should return 400 when mode is not free and not unlocked', async () => {
    // isModeFreeOrUnlocked checks mode_unlocks + subscriptions
    // 'nonexistent' is not in FREE_MODES, so it queries mode_unlocks (returns null)
    db.queryOne.mockResolvedValueOnce(null);
    // then checks subscriptions (returns null)
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .post('/api/modes/users/42')
      .send({ modes: ['nonexistent'] })
      .expect(400);

    expect(res.body.error).toContain('requires unlock');
  });
});

describe('DELETE /api/modes/users/:userId/:modeId', () => {
  it('should return 200 when mode removed successfully', async () => {
    db.execute.mockResolvedValueOnce(1);

    const res = await request(buildApp())
      .delete('/api/modes/users/42/1')
      .expect(200);

    expect(res.body.data.message).toBe('Mode removed successfully');
  });

  it('should return 404 when mode not found for user', async () => {
    db.execute.mockResolvedValueOnce(0);

    const res = await request(buildApp())
      .delete('/api/modes/users/42/999')
      .expect(404);

    expect(res.body.error).toContain('not found');
  });

  it('should return 500 when database throws', async () => {
    db.execute.mockRejectedValueOnce(new Error('constraint error'));

    const res = await request(buildApp())
      .delete('/api/modes/users/42/1')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('PATCH /api/modes/users/:userId/:modeId', () => {
  it('should return 200 when settings updated', async () => {
    db.queryOne.mockResolvedValueOnce({
      user_id: 42, mode_id: 1, settings: { reminder: true },
    });

    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({ settings: { reminder: true } })
      .expect(200);

    expect(res.body.data.message).toBe('Mode settings updated successfully');
  });

  it('should return 400 when settings object is missing', async () => {
    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({})
      .expect(400);

    expect(res.body.error).toContain('settings');
  });

  it('should return 404 when mode not found for user', async () => {
    db.queryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .patch('/api/modes/users/42/1')
      .send({ settings: { reminder: false } })
      .expect(404);

    expect(res.body.error).toContain('not found');
  });
});

describe('GET /api/modes/:modeId/quests', () => {
  it('should return 200 with quest templates for mode', async () => {
    db.query.mockResolvedValueOnce([
      { id: 1, name: 'Morning Run', description: 'Run 2km', xp_reward: 50, frequency: 'daily', difficulty: 'easy', requires_timer: false, is_mandatory: false },
    ]);

    const res = await request(buildApp())
      .get('/api/modes/1/quests')
      .expect(200);

    expect(res.body.data.quests).toHaveLength(1);
    expect(res.body.data.count).toBe(1);
    expect(res.body.data.quests[0].name).toBe('Morning Run');
  });

  it('should return empty array for mode with no quests', async () => {
    db.query.mockResolvedValueOnce([]);

    const res = await request(buildApp())
      .get('/api/modes/999/quests')
      .expect(200);

    expect(res.body.data.quests).toHaveLength(0);
    expect(res.body.data.count).toBe(0);
  });

  it('should return 500 when database throws', async () => {
    db.query.mockRejectedValueOnce(new Error('timeout'));

    const res = await request(buildApp())
      .get('/api/modes/1/quests')
      .expect(500);

    expect(res.body.error).toBe('Internal Server Error');
  });
});
