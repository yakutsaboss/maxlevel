/**
 * Tests for Plan Generator (bot/src/utils/planGenerator.ts)
 *
 * Tests: generatePlan entry point, fitness plan generation (schedule, exercises,
 *        recommendations, day resolution), hydration plan generation (targets,
 *        recommendations), edge cases (null responses, unsupported modes).
 * Mocks: logger
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
import type { FitnessPlan, HydrationPlan } from '../../utils/planGenerator.js';

// ─── Tests ──────────────────────────────────────────────────────────

describe('generatePlan — entry point', () => {
  it('returns null for missing quiz_responses', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: null as any });
    expect(result).toBeNull();
  });

  it('returns null for non-object quiz_responses', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: 'invalid' as any });
    expect(result).toBeNull();
  });

  it('returns null for unsupported mode', () => {
    const result = generatePlan({ mode: 'meditation', quiz_responses: {} });
    expect(result).toBeNull();
  });

  it('generates a fitness plan for mode=fitness', () => {
    const result = generatePlan({ mode: 'fitness', quiz_responses: {} });
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('fitness');
  });

  it('generates a hydration plan for mode=hydration', () => {
    const result = generatePlan({ mode: 'hydration', quiz_responses: {} });
    expect(result).not.toBeNull();
    expect(result!.mode).toBe('hydration');
  });
});

describe('generatePlan — fitness mode', () => {
  it('uses default values when quiz_responses is empty', () => {
    const plan = generatePlan({ mode: 'fitness', quiz_responses: {} }) as FitnessPlan;

    expect(plan.mode).toBe('fitness');
    expect(plan.fitnessLevel).toBe('beginner');
    expect(plan.weeklyFrequency).toBe(3);
    expect(plan.schedule).toHaveLength(3);
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.created_at).toBeDefined();
  });

  it('respects fitness_level and workout_frequency', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: {
        fitness_level: 'advanced',
        workout_frequency: '5',
      },
    }) as FitnessPlan;

    expect(plan.fitnessLevel).toBe('advanced');
    expect(plan.weeklyFrequency).toBe(5);
    expect(plan.schedule).toHaveLength(5);
  });

  it('sets duration based on fitness level', () => {
    const beginner = generatePlan({
      mode: 'fitness',
      quiz_responses: { fitness_level: 'beginner' },
    }) as FitnessPlan;
    expect(beginner.schedule[0].durationMinutes).toBe(30);

    const expert = generatePlan({
      mode: 'fitness',
      quiz_responses: { fitness_level: 'expert', workout_frequency: '1' },
    }) as FitnessPlan;
    expect(expert.schedule[0].durationMinutes).toBe(75);
  });

  it('resolves workout_days from day codes', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: {
        workout_frequency: '2',
        workout_days: ['mon', 'fri'],
      },
    }) as FitnessPlan;

    expect(plan.schedule).toHaveLength(2);
    expect(plan.schedule[0].day).toBe('Monday');
    expect(plan.schedule[1].day).toBe('Friday');
  });

  it('uses first N weekdays when workout_days is empty', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: { workout_frequency: '2' },
    }) as FitnessPlan;

    expect(plan.schedule[0].day).toBe('Monday');
    expect(plan.schedule[1].day).toBe('Tuesday');
  });

  it('each schedule day has exercises', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: {
        fitness_level: 'intermediate',
        equipment: ['bodyweight'],
        focus_areas: ['upper_body', 'lower_body'],
      },
    }) as FitnessPlan;

    for (const day of plan.schedule) {
      expect(day.exercises.length).toBeGreaterThan(0);
      expect(day.focus).toBeDefined();
    }
  });

  it('rotates focus areas across days', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: {
        workout_frequency: '4',
        focus_areas: ['upper_body', 'lower_body'],
      },
    }) as FitnessPlan;

    expect(plan.schedule[0].focus).toBe('upper_body');
    expect(plan.schedule[1].focus).toBe('lower_body');
    expect(plan.schedule[2].focus).toBe('upper_body');
    expect(plan.schedule[3].focus).toBe('lower_body');
  });

  it('full_body only rotation fills all days with full_body', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: {
        workout_frequency: '3',
        focus_areas: ['full_body'],
      },
    }) as FitnessPlan;

    for (const day of plan.schedule) {
      expect(day.focus).toBe('full_body');
    }
  });

  it('includes beginner recommendations for beginner level', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: { fitness_level: 'beginner' },
    }) as FitnessPlan;

    expect(plan.recommendations.some(r => r.includes('proper form'))).toBe(true);
  });

  it('includes motivation-based recommendations', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: { motivation: ['lose_weight', 'build_muscle'] },
    }) as FitnessPlan;

    expect(plan.recommendations.some(r => r.includes('caloric deficit'))).toBe(true);
    expect(plan.recommendations.some(r => r.includes('protein'))).toBe(true);
  });

  it('includes high-frequency recommendation for 6+ days', () => {
    const plan = generatePlan({
      mode: 'fitness',
      quiz_responses: { workout_frequency: '6' },
    }) as FitnessPlan;

    expect(plan.recommendations.some(r => r.includes('6+ sessions'))).toBe(true);
  });
});

describe('generatePlan — hydration mode', () => {
  it('uses default values when quiz_responses is empty', () => {
    const plan = generatePlan({ mode: 'hydration', quiz_responses: {} }) as HydrationPlan;

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
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: {
        daily_target: '10',
        container: 'bottle',
      },
    }) as HydrationPlan;

    expect(plan.targets.dailyGlasses).toBe(10);
    expect(plan.targets.dailyMl).toBe(2500); // 10 * 250
  });

  it('calculates reminder interval from reminder_frequency', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: { reminder_frequency: '30min' },
    }) as HydrationPlan;

    expect(plan.targets.reminderIntervalMinutes).toBe(30);
  });

  it('parses nested wake_time object', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: {
        wake_time: { wake_time: '06:30', sleep_time: '22:00' },
      },
    }) as HydrationPlan;

    expect(plan.targets.wakeTime).toBe('06:30');
    expect(plan.targets.sleepTime).toBe('22:00');
  });

  it('includes low-intake ramp-up advice for current_intake=low', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: { current_intake: 'low' },
    }) as HydrationPlan;

    expect(plan.recommendations.some(r => r.includes('increase gradually'))).toBe(true);
  });

  it('includes goal-based recommendations', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: { goals: ['skin', 'energy'] },
    }) as HydrationPlan;

    expect(plan.recommendations.some(r => r.includes('skin benefits'))).toBe(true);
    expect(plan.recommendations.some(r => r.includes('waking up'))).toBe(true);
  });

  it('includes electrolyte advice for high daily target', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: { daily_target: '12' },
    }) as HydrationPlan;

    expect(plan.recommendations.some(r => r.includes('electrolytes'))).toBe(true);
  });

  it('container refill count is included in recommendations', () => {
    const plan = generatePlan({
      mode: 'hydration',
      quiz_responses: { container: 'jug', daily_target: '8' },
    }) as HydrationPlan;

    // 8 glasses * 250ml = 2000ml / 1000ml jug = 2 refills
    expect(plan.recommendations.some(r => r.includes('2 refill'))).toBe(true);
  });
});
