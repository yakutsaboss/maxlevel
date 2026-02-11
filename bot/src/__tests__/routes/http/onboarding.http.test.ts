/**
 * HTTP integration tests for onboarding routes (bot/src/api/routes/onboarding.ts)
 *
 * Uses supertest to exercise the full Express request/response cycle.
 * Telegram authentication is mocked to bypass validation.
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

// ─── Import router after mocks ─────────────────────────────────────

import { onboardingRouter } from '../../../api/routes/onboarding.js';

function buildApp() {
  const app = createTestApp();
  app.use('/api/onboarding', onboardingRouter);
  addTestErrorHandler(app);
  return app;
}

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
});

describe('GET /api/onboarding/:telegramId', () => {
  it('should return 200 with onboarding state when it exists', async () => {
    mockQueryOne.mockResolvedValueOnce({
      current_step: 'quiz',
      quiz_data: { selected_modes: ['sleep'] },
      last_updated: '2025-06-01T00:00:00Z',
    });

    const res = await request(buildApp())
      .get('/api/onboarding/123456')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.current_step).toBe('quiz');
    expect(res.body.data.quiz_data.selected_modes).toContain('sleep');
  });

  it('should return 200 with defaults when no state exists', async () => {
    mockQueryOne.mockResolvedValueOnce(null);

    const res = await request(buildApp())
      .get('/api/onboarding/999999')
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.current_step).toBeNull();
    expect(res.body.data.quiz_data).toBeNull();
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('connection lost'));

    const res = await request(buildApp())
      .get('/api/onboarding/123456')
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});

describe('PUT /api/onboarding/:telegramId', () => {
  it('should return 200 when saving onboarding progress', async () => {
    mockQueryOne.mockResolvedValueOnce({
      current_step: 'mode_selection',
      quiz_data: { selected_modes: ['fitness'] },
    });

    const res = await request(buildApp())
      .put('/api/onboarding/123456')
      .send({ current_step: 'mode_selection', quiz_data: { selected_modes: ['fitness'] } })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.current_step).toBe('mode_selection');
  });

  it('should return 400 when current_step is missing', async () => {
    const res = await request(buildApp())
      .put('/api/onboarding/123456')
      .send({ quiz_data: { foo: 'bar' } })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toContain('current_step');
  });

  it('should return 500 when database throws', async () => {
    mockQueryOne.mockRejectedValueOnce(new Error('write failed'));

    const res = await request(buildApp())
      .put('/api/onboarding/123456')
      .send({ current_step: 'quiz' })
      .expect(500);

    expect(res.body.success).toBe(false);
  });
});

describe('POST /api/onboarding/:telegramId/complete', () => {
  it('should return 200 when completing onboarding', async () => {
    // userLookup
    mockQueryOne.mockResolvedValueOnce({ id: 42 });
    // executePythonTool for mode_manager --add-modes
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: {} });
    // transaction
    mockTransaction.mockImplementationOnce(async (fn: any) => {
      const mockClient = {
        query: vi.fn().mockResolvedValue({ rows: [], rowCount: 1 }),
      };
      return fn(mockClient);
    });
    // executePythonTool for quest_manager --assign-daily
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: {} });

    const res = await request(buildApp())
      .post('/api/onboarding/123456/complete')
      .send({
        quiz_data: {
          selected_modes: ['sleep', 'fitness'],
          punishments: { consent_given: true, intensity_level: 'medium' },
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Onboarding completed successfully');
    expect(res.body.data.xp_awarded).toBe(50);
  });

  it('should return 400 when quiz_data is missing', async () => {
    const res = await request(buildApp())
      .post('/api/onboarding/123456/complete')
      .send({})
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing quiz_data or selected_modes');
  });

  it('should return 400 when selected_modes is missing', async () => {
    const res = await request(buildApp())
      .post('/api/onboarding/123456/complete')
      .send({ quiz_data: {} })
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Missing quiz_data or selected_modes');
  });

  it('should return 404 when user is not found', async () => {
    mockQueryOne.mockResolvedValueOnce(null); // userLookup returns null

    const res = await request(buildApp())
      .post('/api/onboarding/123456/complete')
      .send({ quiz_data: { selected_modes: ['sleep'] } })
      .expect(404);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 500 when transaction fails', async () => {
    mockQueryOne.mockResolvedValueOnce({ id: 42 });
    mockExecutePythonTool.mockResolvedValueOnce({ success: true, data: {} });
    mockTransaction.mockRejectedValueOnce(new Error('transaction rollback'));

    const res = await request(buildApp())
      .post('/api/onboarding/123456/complete')
      .send({ quiz_data: { selected_modes: ['fitness'] } })
      .expect(500);

    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Internal Server Error');
  });
});
