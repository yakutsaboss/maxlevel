/**
 * Tests for Hydration Plan Generator (bot/src/utils/hydrationPlanGenerator.ts)
 *
 * After the Run 58 split, hydration logic lives in its own module. These tests
 * import directly from hydrationPlanGenerator.ts. Will fail until Agent B's
 * merge lands — that's expected.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Import after mocks ─────────────────────────────────────────────

import {
  generateHydrationPlan,
  buildHydrationRecommendations,
} from '../../utils/hydrationPlanGenerator.js';
import type { HydrationPlan } from '../../utils/planTypes.js';

// ─── generateHydrationPlan ──────────────────────────────────────────

describe('generateHydrationPlan', () => {
  it('returns a HydrationPlan with defaults for empty responses', () => {
    const plan = generateHydrationPlan({});

    expect(plan.mode).toBe('hydration');
    expect(plan.targets.dailyGlasses).toBe(8);
    expect(plan.targets.dailyMl).toBe(2000); // 8 * 250
    expect(plan.targets.reminderIntervalMinutes).toBe(120); // default '2h'
    expect(plan.targets.wakeTime).toBe('08:00');
    expect(plan.targets.sleepTime).toBe('23:00');
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.created_at).toBeDefined();
  });

  it('respects daily_target and container', () => {
    const plan = generateHydrationPlan({
      daily_target: '10',
      container: 'bottle',
    });

    expect(plan.targets.dailyGlasses).toBe(10);
    expect(plan.targets.dailyMl).toBe(2500); // 10 * 250
  });

  it('calculates reminder interval from reminder_frequency', () => {
    const plan = generateHydrationPlan({ reminder_frequency: '30min' });
    expect(plan.targets.reminderIntervalMinutes).toBe(30);
  });

  it('parses nested wake_time object with wake_time and sleep_time', () => {
    const plan = generateHydrationPlan({
      wake_time: { wake_time: '06:30', sleep_time: '22:00' },
    });

    expect(plan.targets.wakeTime).toBe('06:30');
    expect(plan.targets.sleepTime).toBe('22:00');
  });

  it('uses string wake_time directly when not nested', () => {
    const plan = generateHydrationPlan({
      wake_time: '07:00',
      sleep_time: '22:30',
    });

    expect(plan.targets.wakeTime).toBe('07:00');
    expect(plan.targets.sleepTime).toBe('22:30');
  });

  it('different daily_target values produce different ml totals', () => {
    const plan6 = generateHydrationPlan({ daily_target: '6' });
    const plan12 = generateHydrationPlan({ daily_target: '12' });

    expect(plan6.targets.dailyMl).toBe(1500);
    expect(plan12.targets.dailyMl).toBe(3000);
    expect(plan12.targets.dailyMl).toBeGreaterThan(plan6.targets.dailyMl);
  });
});

// ─── buildHydrationRecommendations ──────────────────────────────────

describe('buildHydrationRecommendations', () => {
  it('returns a non-empty array', () => {
    const recs = buildHydrationRecommendations(8, 'medium', ['health'], 'glass');
    expect(recs.length).toBeGreaterThan(0);
  });

  it('includes ramp-up advice for low current intake', () => {
    const recs = buildHydrationRecommendations(8, 'low', ['health'], 'glass');
    expect(recs.some(r => r.includes('increase gradually'))).toBe(true);
  });

  it('includes electrolyte advice for high daily target (12+)', () => {
    const recs = buildHydrationRecommendations(12, 'medium', ['health'], 'glass');
    expect(recs.some(r => r.includes('electrolytes'))).toBe(true);
  });

  it('does not include electrolyte advice for low target', () => {
    const recs = buildHydrationRecommendations(6, 'medium', ['health'], 'glass');
    expect(recs.some(r => r.includes('electrolytes'))).toBe(false);
  });

  it('includes goal-based recommendations for skin and energy', () => {
    const recs = buildHydrationRecommendations(8, 'medium', ['skin', 'energy'], 'glass');
    expect(recs.some(r => r.includes('skin benefits'))).toBe(true);
    expect(recs.some(r => r.includes('waking up'))).toBe(true);
  });

  it('calculates correct refill count for jug container', () => {
    // 8 glasses * 250ml = 2000ml / 1000ml jug = 2 refills
    const recs = buildHydrationRecommendations(8, 'medium', ['health'], 'jug');
    expect(recs.some(r => r.includes('2 refill'))).toBe(true);
  });

  it('calculates correct refill count for bottle container', () => {
    // 8 glasses * 250ml = 2000ml / 500ml bottle = 4 refills
    const recs = buildHydrationRecommendations(8, 'medium', ['health'], 'bottle');
    expect(recs.some(r => r.includes('4 refill'))).toBe(true);
  });
});
