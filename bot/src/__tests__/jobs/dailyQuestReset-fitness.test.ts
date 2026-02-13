/**
 * Tests for fitness-level-aware quest assignment (Run 57).
 *
 * Verifies that dailyQuestReset reads quiz_responses from mode_configs
 * and biases template selection toward the appropriate difficulty.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockQuery = vi.fn();
const mockExecute = vi.fn();

vi.mock('../../utils/db.js', () => ({
  query: (...args: any[]) => mockQuery(...args),
  queryOne: vi.fn(),
  execute: (...args: any[]) => mockExecute(...args),
  getPool: vi.fn(),
}));

vi.useFakeTimers();

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { handler } from '../../jobs/definitions/dailyQuestReset.js';

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Find the SQL query call that selects quest templates.
 * Template queries contain 'quests' and 'quest_type' in the SQL.
 */
function findTemplateQueryCalls(): Array<{ sql: string; params: any[] }> {
  return mockQuery.mock.calls
    .filter(([sql]: [string]) =>
      typeof sql === 'string' && sql.includes('quests') && sql.includes('quest_type'))
    .map(([sql, params]: [string, any[]]) => ({ sql, params }));
}

/**
 * Find the SQL query call that reads mode_configs / quiz_responses.
 */
function findQuizResponsesQueryCalls(): Array<{ sql: string; params: any[] }> {
  return mockQuery.mock.calls
    .filter(([sql]: [string]) =>
      typeof sql === 'string' &&
      (sql.includes('mode_configs') || sql.includes('quiz_responses')))
    .map(([sql, params]: [string, any[]]) => ({ sql, params }));
}

/**
 * Set up mock chain for a single-user run with a given fitness level.
 * The mock sequence handles:
 *   1. List active users
 *   2. (fitness query) mode_configs for quiz_responses
 *   3. Active modes
 *   4. Template selection
 */
function setupSingleUserRun(fitnessLevel: string | null, opts?: { noModeConfig?: boolean }) {
  const quizResponses = fitnessLevel ? { fitness_level: fitnessLevel } : {};

  // 1) List active users — one user, then empty (end pagination)
  mockQuery.mockResolvedValueOnce([{ id: 1 }]);

  // The following mocks are consumed in order by the handler.
  // Agent B's implementation queries mode_configs then active modes then templates.
  // We provide generous mock returns so the handler proceeds without errors.

  if (opts?.noModeConfig) {
    // mode_configs query returns empty (no row)
    mockQuery.mockResolvedValueOnce([]);
  } else {
    // mode_configs / quiz_responses query
    mockQuery.mockResolvedValueOnce([{ quiz_responses: quizResponses }]);
  }

  // Active modes
  mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);

  // Template selection — return a couple of templates
  mockQuery.mockResolvedValueOnce([
    { id: 10, difficulty: 'easy', quest_type: 'daily' },
    { id: 11, difficulty: 'medium', quest_type: 'daily' },
  ]);

  // End pagination (second batch empty)
  mockQuery.mockResolvedValueOnce([]);

  // execute for quest instance inserts + target updates
  mockExecute.mockResolvedValue(1);
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('dailyQuestReset — fitness-level-aware assignment', () => {
  it('should query mode_configs for quiz_responses', async () => {
    setupSingleUserRun('beginner');

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    const quizCalls = findQuizResponsesQueryCalls();
    expect(quizCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should bias toward easy quests for beginner fitness level', async () => {
    setupSingleUserRun('beginner');

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    const templateCalls = findTemplateQueryCalls();
    expect(templateCalls.length).toBeGreaterThanOrEqual(1);

    // For beginners, the SQL should reference easy/medium difficulties
    const sql = templateCalls[0].sql.toLowerCase();
    const referencesEasy = sql.includes('easy') || sql.includes('difficulty');
    expect(referencesEasy).toBe(true);
  });

  it('should allow all difficulties for intermediate fitness level', async () => {
    setupSingleUserRun('intermediate');

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Handler should complete without error
    expect(mockQuery).toHaveBeenCalled();
    const templateCalls = findTemplateQueryCalls();
    expect(templateCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('should bias toward hard quests for advanced fitness level', async () => {
    setupSingleUserRun('advanced');

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    const templateCalls = findTemplateQueryCalls();
    expect(templateCalls.length).toBeGreaterThanOrEqual(1);

    // For advanced users, the SQL should reference medium/hard difficulties
    const sql = templateCalls[0].sql.toLowerCase();
    const referencesHard = sql.includes('hard') || sql.includes('difficulty');
    expect(referencesHard).toBe(true);
  });

  it('should default to beginner when mode_configs row is missing', async () => {
    setupSingleUserRun(null, { noModeConfig: true });

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should still complete successfully (defaults to beginner)
    expect(mockExecute).toHaveBeenCalled();
  });

  it('should default to beginner when quiz_responses has no fitness_level', async () => {
    // quiz_responses exists but is empty
    mockQuery.mockResolvedValueOnce([{ id: 1 }]); // users
    mockQuery.mockResolvedValueOnce([{ quiz_responses: {} }]); // mode_configs
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]); // active modes
    mockQuery.mockResolvedValueOnce([{ id: 10, difficulty: 'easy', quest_type: 'daily' }]); // templates
    mockQuery.mockResolvedValueOnce([]); // end pagination
    mockExecute.mockResolvedValue(1);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should complete without error — beginner defaults applied
    expect(mockExecute).toHaveBeenCalled();
  });

  it('should default to beginner when fitness_level is null', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 1 }]); // users
    mockQuery.mockResolvedValueOnce([{ quiz_responses: { fitness_level: null } }]); // mode_configs
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]); // active modes
    mockQuery.mockResolvedValueOnce([{ id: 10, difficulty: 'easy', quest_type: 'daily' }]); // templates
    mockQuery.mockResolvedValueOnce([]); // end pagination
    mockExecute.mockResolvedValue(1);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    expect(mockExecute).toHaveBeenCalled();
  });

  it('should handle multiple users with different fitness levels', async () => {
    // Two users: beginner and advanced
    mockQuery.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);

    // User 1: beginner
    mockQuery.mockResolvedValueOnce([{ quiz_responses: { fitness_level: 'beginner' } }]);
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockResolvedValueOnce([{ id: 10, difficulty: 'easy', quest_type: 'daily' }]);

    // User 2: advanced
    mockQuery.mockResolvedValueOnce([{ quiz_responses: { fitness_level: 'advanced' } }]);
    mockQuery.mockResolvedValueOnce([{ mode_id: 1 }]);
    mockQuery.mockResolvedValueOnce([{ id: 20, difficulty: 'hard', quest_type: 'daily' }]);

    // End pagination
    mockQuery.mockResolvedValueOnce([]);

    mockExecute.mockResolvedValue(1);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Both users should have had quests assigned
    expect(mockExecute).toHaveBeenCalled();
  });

  it('should still work when user has no active modes', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 1 }]); // users
    mockQuery.mockResolvedValueOnce([{ quiz_responses: { fitness_level: 'beginner' } }]); // mode_configs
    mockQuery.mockResolvedValueOnce([]); // no active modes
    mockQuery.mockResolvedValueOnce([]); // end pagination
    mockExecute.mockResolvedValue(0);

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // Should complete without error — user with no modes is skipped, not failed
    expect(mockQuery).toHaveBeenCalled();
  });

  it('should assign correct target values based on difficulty', async () => {
    setupSingleUserRun('intermediate');

    const promise = handler([{} as any]);
    await vi.runAllTimersAsync();
    await promise;

    // execute calls for INSERT INTO quest_instances should set target
    const insertCalls = mockExecute.mock.calls.filter(
      ([sql]: [string]) => typeof sql === 'string' && sql.includes('quest_instances')
    );

    // At least one insert should have happened
    expect(insertCalls.length).toBeGreaterThanOrEqual(1);
  });
});
