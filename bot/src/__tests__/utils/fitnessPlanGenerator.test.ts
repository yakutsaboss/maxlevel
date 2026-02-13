/**
 * Tests for Fitness Plan Generator (bot/src/utils/fitnessPlanGenerator.ts)
 *
 * After the Run 58 split, fitness logic lives in its own module. These tests
 * import directly from fitnessPlanGenerator.ts. Will fail until Agent B's
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
  generateFitnessPlan,
  pickExercises,
  durationForLevel,
  buildFocusRotation,
} from '../../utils/fitnessPlanGenerator.js';
import type { FitnessPlan } from '../../utils/planTypes.js';

// ─── generateFitnessPlan ────────────────────────────────────────────

describe('generateFitnessPlan', () => {
  it('returns a FitnessPlan with default values for empty responses', () => {
    const plan = generateFitnessPlan({});

    expect(plan.mode).toBe('fitness');
    expect(plan.fitnessLevel).toBe('beginner');
    expect(plan.weeklyFrequency).toBe(3);
    expect(plan.schedule).toHaveLength(3);
    expect(plan.recommendations.length).toBeGreaterThan(0);
    expect(plan.created_at).toBeDefined();
  });

  it('respects fitness_level=advanced and workout_frequency=5', () => {
    const plan = generateFitnessPlan({
      fitness_level: 'advanced',
      workout_frequency: '5',
    });

    expect(plan.fitnessLevel).toBe('advanced');
    expect(plan.weeklyFrequency).toBe(5);
    expect(plan.schedule).toHaveLength(5);
  });

  it('resolves workout_days from day codes (mon, fri)', () => {
    const plan = generateFitnessPlan({
      workout_frequency: '2',
      workout_days: ['mon', 'fri'],
    });

    expect(plan.schedule).toHaveLength(2);
    expect(plan.schedule[0].day).toBe('Monday');
    expect(plan.schedule[1].day).toBe('Friday');
  });

  it('falls back to first N weekdays when workout_days is empty', () => {
    const plan = generateFitnessPlan({ workout_frequency: '2' });

    expect(plan.schedule[0].day).toBe('Monday');
    expect(plan.schedule[1].day).toBe('Tuesday');
  });

  it('each schedule day includes exercises', () => {
    const plan = generateFitnessPlan({
      fitness_level: 'intermediate',
      equipment: ['bodyweight'],
      focus_areas: ['upper_body', 'lower_body'],
    });

    for (const day of plan.schedule) {
      expect(day.exercises.length).toBeGreaterThan(0);
      expect(day.focus).toBeDefined();
    }
  });

  it('rotates focus areas across days', () => {
    const plan = generateFitnessPlan({
      workout_frequency: '4',
      focus_areas: ['upper_body', 'lower_body'],
    });

    expect(plan.schedule[0].focus).toBe('upper_body');
    expect(plan.schedule[1].focus).toBe('lower_body');
    expect(plan.schedule[2].focus).toBe('upper_body');
    expect(plan.schedule[3].focus).toBe('lower_body');
  });

  it('includes beginner-level recommendations', () => {
    const plan = generateFitnessPlan({ fitness_level: 'beginner' });
    expect(plan.recommendations.some(r => r.includes('proper form'))).toBe(true);
  });

  it('includes motivation-based recommendations', () => {
    const plan = generateFitnessPlan({
      motivation: ['lose_weight', 'build_muscle'],
    });

    expect(plan.recommendations.some(r => r.includes('caloric deficit'))).toBe(true);
    expect(plan.recommendations.some(r => r.includes('protein'))).toBe(true);
  });

  it('includes high-frequency recommendation for 6+ sessions', () => {
    const plan = generateFitnessPlan({ workout_frequency: '6' });
    expect(plan.recommendations.some(r => r.includes('6+ sessions'))).toBe(true);
  });
});

// ─── durationForLevel ───────────────────────────────────────────────

describe('durationForLevel', () => {
  it('returns 30 for beginner', () => {
    expect(durationForLevel('beginner')).toBe(30);
  });

  it('returns 45 for intermediate', () => {
    expect(durationForLevel('intermediate')).toBe(45);
  });

  it('returns 60 for advanced', () => {
    expect(durationForLevel('advanced')).toBe(60);
  });

  it('returns 75 for expert', () => {
    expect(durationForLevel('expert')).toBe(75);
  });

  it('returns 40 for unknown level', () => {
    expect(durationForLevel('unknown_level')).toBe(40);
  });
});

// ─── buildFocusRotation ─────────────────────────────────────────────

describe('buildFocusRotation', () => {
  it('returns all full_body when only full_body is chosen', () => {
    const rotation = buildFocusRotation(['full_body'], 3);
    expect(rotation).toEqual(['full_body', 'full_body', 'full_body']);
  });

  it('cycles specific areas across days', () => {
    const rotation = buildFocusRotation(['upper_body', 'lower_body'], 5);
    expect(rotation).toEqual([
      'upper_body', 'lower_body', 'upper_body', 'lower_body', 'upper_body',
    ]);
  });

  it('filters out full_body when mixed with specific areas', () => {
    const rotation = buildFocusRotation(['full_body', 'core', 'cardio'], 4);
    expect(rotation).toEqual(['core', 'cardio', 'core', 'cardio']);
  });

  it('returns full_body fill when no areas provided', () => {
    // Empty focus_areas edge case: after filtering, specific is empty → full_body fallback
    const rotation = buildFocusRotation([], 3);
    expect(rotation).toEqual(['full_body', 'full_body', 'full_body']);
  });
});

// ─── pickExercises ──────────────────────────────────────────────────

describe('pickExercises', () => {
  it('returns exercises matching focus, level, and equipment', () => {
    const exercises = pickExercises(
      ['upper_body'],
      ['bodyweight'],
      'beginner',
      'upper_body',
      4,
    );

    expect(exercises.length).toBeGreaterThan(0);
    expect(exercises.length).toBeLessThanOrEqual(4);
  });

  it('falls back to wider pool when not enough focus-specific matches', () => {
    // 'pool' equipment with 'flexibility' focus at 'expert' — very narrow
    const exercises = pickExercises(
      ['flexibility'],
      ['pool'],
      'expert',
      'flexibility',
      4,
    );

    // Should still return something from the wider fallback pool
    expect(exercises.length).toBeGreaterThan(0);
  });

  it('returns no duplicates', () => {
    const exercises = pickExercises(
      ['full_body'],
      ['bodyweight', 'home_basics', 'full_gym'],
      'intermediate',
      'full_body',
      10,
    );

    const unique = new Set(exercises);
    expect(unique.size).toBe(exercises.length);
  });
});
