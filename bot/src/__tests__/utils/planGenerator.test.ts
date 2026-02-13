/**
 * Tests for Plan Generator orchestrator (bot/src/utils/planGenerator.ts)
 *
 * After the Run 58 split, planGenerator.ts is the thin entry point that
 * delegates to fitnessPlanGenerator / hydrationPlanGenerator based on mode.
 * These tests verify delegation, null-safety, and type narrowing.
 *
 * Imports target the NEW split file locations (planGenerator.ts re-exports
 * generatePlan; types come from planTypes.ts). Will fail until Agent B's
 * merge lands — that's expected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

const mockLogInfo = vi.fn();
const mockLogWarn = vi.fn();

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: (...args: any[]) => mockLogInfo(...args),
      warn: (...args: any[]) => mockLogWarn(...args),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import { generatePlan } from '../../utils/planGenerator.js';
import type { FitnessPlan, HydrationPlan } from '../../utils/planTypes.js';

// ─── Tests ──────────────────────────────────────────────────────────

describe('generatePlan — orchestrator delegation', () => {
  it('returns null for missing quiz_responses', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: null as any });
    expect(result).toBeNull();
  });

  it('returns null for non-object quiz_responses (string)', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: 'invalid' as any });
    expect(result).toBeNull();
  });

  it('returns null for unsupported mode', () => {
    const result = generatePlan({ mode: 'meditation', quiz_responses: {} });
    expect(result).toBeNull();
  });

  it('delegates to fitness generator when mode=fitness', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: {} });
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('fitness');
    expect((result as FitnessPlan).schedule).toBeDefined();
  });

  it('delegates to hydration generator when mode=hydration', () => {
    const result = generatePlan({ mode: 'hydration', quiz_responses: {} });
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('hydration');
    expect((result as HydrationPlan).targets).toBeDefined();
  });

  it('narrows QuizResponses correctly — empty object is valid', () => {
    // An empty {} is a valid QuizResponses and should not return null
    const fitness = generatePlan({ mode: 'fitness', quiz_responses: {} });
    const hydration = generatePlan({ mode: 'hydration', quiz_responses: {} });
    expect(fitness).not.toBeNull();
    expect(hydration).not.toBeNull();
  });
});
