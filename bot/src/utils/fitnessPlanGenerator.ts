/**
 * Fitness Plan Generator
 *
 * Generates a personalized fitness plan from onboarding quiz responses.
 * Rule-based generation — no AI calls.
 */

import { logger } from './logger.js';
import type { QuizResponses, FitnessPlan, FitnessScheduleDay } from './planTypes.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Map short day codes (from day-grid) to full names. */
const DAY_CODE_MAP: Record<string, string> = {
  mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday',
  fri: 'Friday', sat: 'Saturday', sun: 'Sunday',
};

interface ExercisePool {
  name: string;
  focus: string[];
  equipment: string[];
  level: string[];
}

const EXERCISE_POOL: ExercisePool[] = [
  // Upper body
  { name: 'Push-ups', focus: ['upper_body', 'full_body'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Dumbbell shoulder press', focus: ['upper_body'], equipment: ['home_basics', 'full_gym'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Pull-ups', focus: ['upper_body', 'full_body'], equipment: ['full_gym', 'outdoor'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Bench press', focus: ['upper_body'], equipment: ['full_gym'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Dumbbell rows', focus: ['upper_body'], equipment: ['home_basics', 'full_gym'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Resistance band curls', focus: ['upper_body'], equipment: ['home_basics'], level: ['beginner', 'intermediate'] },

  // Lower body
  { name: 'Bodyweight squats', focus: ['lower_body', 'full_body'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['beginner', 'intermediate'] },
  { name: 'Barbell squats', focus: ['lower_body', 'full_body'], equipment: ['full_gym'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Lunges', focus: ['lower_body'], equipment: ['bodyweight', 'home_basics', 'full_gym', 'outdoor'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Deadlifts', focus: ['lower_body', 'full_body'], equipment: ['full_gym'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Glute bridges', focus: ['lower_body'], equipment: ['bodyweight', 'home_basics'], level: ['beginner', 'intermediate'] },
  { name: 'Leg press', focus: ['lower_body'], equipment: ['full_gym'], level: ['intermediate', 'advanced', 'expert'] },

  // Core
  { name: 'Plank hold', focus: ['core', 'full_body'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Crunches', focus: ['core'], equipment: ['bodyweight', 'home_basics'], level: ['beginner', 'intermediate'] },
  { name: 'Russian twists', focus: ['core'], equipment: ['bodyweight', 'home_basics'], level: ['intermediate', 'advanced'] },
  { name: 'Hanging leg raises', focus: ['core'], equipment: ['full_gym', 'outdoor'], level: ['advanced', 'expert'] },
  { name: 'Mountain climbers', focus: ['core', 'cardio'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['beginner', 'intermediate', 'advanced'] },

  // Cardio
  { name: 'Brisk walking', focus: ['cardio'], equipment: ['bodyweight', 'outdoor'], level: ['beginner'] },
  { name: 'Jogging', focus: ['cardio'], equipment: ['bodyweight', 'outdoor', 'cardio_machines'], level: ['beginner', 'intermediate'] },
  { name: 'Running', focus: ['cardio'], equipment: ['outdoor', 'cardio_machines'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Jump rope', focus: ['cardio', 'full_body'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['intermediate', 'advanced', 'expert'] },
  { name: 'Cycling', focus: ['cardio', 'lower_body'], equipment: ['cardio_machines', 'outdoor'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Swimming', focus: ['cardio', 'full_body'], equipment: ['pool'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Burpees', focus: ['cardio', 'full_body'], equipment: ['bodyweight', 'outdoor'], level: ['intermediate', 'advanced', 'expert'] },

  // Flexibility
  { name: 'Static stretching routine', focus: ['flexibility'], equipment: ['bodyweight', 'home_basics', 'outdoor'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Yoga flow', focus: ['flexibility', 'core'], equipment: ['bodyweight', 'home_basics'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
  { name: 'Foam rolling', focus: ['flexibility'], equipment: ['home_basics', 'full_gym'], level: ['beginner', 'intermediate', 'advanced', 'expert'] },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pickExercises(
  focusAreas: string[],
  equipment: string[],
  level: string,
  targetFocus: string,
  count: number,
): string[] {
  const matching = EXERCISE_POOL.filter((e) =>
    e.focus.includes(targetFocus) &&
    e.level.includes(level) &&
    e.equipment.some((eq) => equipment.includes(eq)),
  );

  // If not enough matches for this focus, fall back to any matching level+equipment
  const pool = matching.length >= count
    ? matching
    : EXERCISE_POOL.filter((e) => e.level.includes(level) && e.equipment.some((eq) => equipment.includes(eq)));

  const selected: string[] = [];
  const used = new Set<string>();
  for (const ex of pool) {
    if (selected.length >= count) break;
    if (!used.has(ex.name)) {
      selected.push(ex.name);
      used.add(ex.name);
    }
  }
  return selected;
}

function durationForLevel(level: string): number {
  switch (level) {
    case 'beginner': return 30;
    case 'intermediate': return 45;
    case 'advanced': return 60;
    case 'expert': return 75;
    default: return 40;
  }
}

function buildFocusRotation(focusAreas: string[], dayCount: number): string[] {
  if (focusAreas.includes('full_body') && focusAreas.length === 1) {
    return Array(dayCount).fill('full_body');
  }

  const specific = focusAreas.filter((a) => a !== 'full_body');
  if (specific.length === 0) return Array(dayCount).fill('full_body');

  const rotation: string[] = [];
  for (let i = 0; i < dayCount; i++) {
    rotation.push(specific[i % specific.length]);
  }
  return rotation;
}

function buildFitnessRecommendations(
  level: string,
  motivation: string[],
  frequency: number,
  focusAreas: string[],
): string[] {
  const recs: string[] = [];

  if (level === 'beginner') {
    recs.push('Start with lighter weights and focus on proper form before increasing intensity.');
    recs.push('Rest at least one day between strength sessions to allow recovery.');
  } else if (level === 'intermediate') {
    recs.push('Progressive overload: increase weight or reps each week to continue making gains.');
  } else if (level === 'advanced' || level === 'expert') {
    recs.push('Periodize your training with deload weeks every 4-6 weeks to prevent overtraining.');
  }

  if (motivation.includes('lose_weight')) {
    recs.push('Combine your workouts with a moderate caloric deficit for sustainable fat loss.');
  }
  if (motivation.includes('build_muscle')) {
    recs.push('Aim for 1.6-2.2g protein per kg bodyweight daily to support muscle growth.');
  }
  if (motivation.includes('sport_performance')) {
    recs.push('Include sport-specific drills alongside general strength and conditioning work.');
  }

  if (frequency >= 6) {
    recs.push('With 6+ sessions per week, include at least one active recovery day (walking, yoga).');
  }

  if (focusAreas.includes('flexibility')) {
    recs.push('Hold each stretch for 30-60 seconds and never bounce — breathe into the stretch.');
  }
  if (focusAreas.includes('cardio')) {
    recs.push('Keep cardio sessions in different heart rate zones for balanced endurance gains.');
  }

  recs.push('Stay hydrated: drink water before, during, and after your workouts.');

  return recs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function generateFitnessPlan(responses: QuizResponses): FitnessPlan {
  const log = logger.child({ component: 'fitnessPlanGenerator', mode: 'fitness' });

  const level: string = String(responses.fitness_level || 'beginner');
  const frequency: number = parseInt(String(responses.workout_frequency ?? ''), 10) || 3;
  const focusAreas: string[] = (Array.isArray(responses.focus_areas) ? responses.focus_areas : ['full_body']) as string[];
  const equipment: string[] = (Array.isArray(responses.equipment) ? responses.equipment : ['bodyweight']) as string[];
  const motivation: string[] = (Array.isArray(responses.motivation) ? responses.motivation : ['stay_healthy']) as string[];
  const workoutDays: string[] = (Array.isArray(responses.workout_days) ? responses.workout_days : []) as string[];

  let selectedDays: string[];
  if (workoutDays.length > 0) {
    selectedDays = workoutDays
      .map((d: string) => DAY_CODE_MAP[d.toLowerCase()] || d)
      .filter(Boolean)
      .slice(0, frequency);
  } else {
    selectedDays = WEEKDAY_NAMES.slice(0, frequency);
  }

  const focusRotation = buildFocusRotation(focusAreas, selectedDays.length);
  const duration = durationForLevel(level);

  const schedule: FitnessScheduleDay[] = selectedDays.map((day, i) => {
    const dayFocus = focusRotation[i % focusRotation.length];
    const exercises = pickExercises(focusAreas, equipment, level, dayFocus, 4);
    return { day, focus: dayFocus, exercises, durationMinutes: duration };
  });

  const recommendations = buildFitnessRecommendations(level, motivation, frequency, focusAreas);

  log.info('Fitness plan generated', {
    level, frequency, daysCount: schedule.length, exerciseCount: schedule.reduce((s, d) => s + d.exercises.length, 0),
  });

  return {
    mode: 'fitness',
    schedule,
    recommendations,
    weeklyFrequency: frequency,
    fitnessLevel: level,
    created_at: new Date().toISOString(),
  };
}
