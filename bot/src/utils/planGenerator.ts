/**
 * Personalized Plan Generator
 *
 * Reads quiz_responses from mode_configs JSONB and produces a personalized plan
 * for fitness and hydration modes. Rule-based generation — no AI calls.
 *
 * Usage:
 *   import { generatePlan } from './planGenerator.js';
 *   const plan = generatePlan({ mode: 'fitness', quiz_responses: {...} });
 */

import { logger } from './logger.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FitnessScheduleDay {
  day: string;
  focus: string;
  exercises: string[];
  durationMinutes: number;
}

export interface FitnessPlan {
  mode: 'fitness';
  schedule: FitnessScheduleDay[];
  recommendations: string[];
  weeklyFrequency: number;
  fitnessLevel: string;
  created_at: string;
}

export interface HydrationTargets {
  dailyGlasses: number;
  dailyMl: number;
  reminderIntervalMinutes: number;
  wakeTime: string;
  sleepTime: string;
}

export interface HydrationPlan {
  mode: 'hydration';
  targets: HydrationTargets;
  recommendations: string[];
  created_at: string;
}

export type PlanType = FitnessPlan | HydrationPlan;

export interface ModeConfig {
  mode: string;
  quiz_responses: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Generate a personalized plan from onboarding quiz responses.
 * Returns null for unsupported modes.
 */
export function generatePlan(modeConfig: ModeConfig): PlanType | null {
  const { mode, quiz_responses } = modeConfig;
  const log = logger.child({ component: 'planGenerator', mode });

  if (!quiz_responses || typeof quiz_responses !== 'object') {
    log.warn('Cannot generate plan: missing or invalid quiz_responses');
    return null;
  }

  log.info('Generating personalized plan', { responseKeys: Object.keys(quiz_responses) });

  if (mode === 'fitness') return generateFitnessPlan(quiz_responses);
  if (mode === 'hydration') return generateHydrationPlan(quiz_responses);

  log.warn('Unsupported mode for plan generation', { mode });
  return null;
}

// ---------------------------------------------------------------------------
// Fitness plan generation
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

function generateFitnessPlan(responses: Record<string, any>): FitnessPlan {
  const log = logger.child({ component: 'planGenerator', mode: 'fitness' });

  const level: string = responses.fitness_level || 'beginner';
  const frequency: number = parseInt(responses.workout_frequency, 10) || 3;
  const focusAreas: string[] = responses.focus_areas || ['full_body'];
  const equipment: string[] = responses.equipment || ['bodyweight'];
  const motivation: string[] = responses.motivation || ['stay_healthy'];
  const workoutDays: string[] = responses.workout_days || [];

  // Resolve which days to train
  let selectedDays: string[];
  if (workoutDays.length > 0) {
    selectedDays = workoutDays
      .map((d: string) => DAY_CODE_MAP[d.toLowerCase()] || d)
      .filter(Boolean)
      .slice(0, frequency);
  } else {
    selectedDays = WEEKDAY_NAMES.slice(0, frequency);
  }

  // Build a focus rotation from user preferences
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

function buildFocusRotation(focusAreas: string[], dayCount: number): string[] {
  if (focusAreas.includes('full_body') && focusAreas.length === 1) {
    // Full body every session
    return Array(dayCount).fill('full_body');
  }

  // Filter out full_body if other specific areas are also chosen
  const specific = focusAreas.filter((a) => a !== 'full_body');
  if (specific.length === 0) return Array(dayCount).fill('full_body');

  // Repeat the specific areas to fill all days
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

  // Level-based
  if (level === 'beginner') {
    recs.push('Start with lighter weights and focus on proper form before increasing intensity.');
    recs.push('Rest at least one day between strength sessions to allow recovery.');
  } else if (level === 'intermediate') {
    recs.push('Progressive overload: increase weight or reps each week to continue making gains.');
  } else if (level === 'advanced' || level === 'expert') {
    recs.push('Periodize your training with deload weeks every 4-6 weeks to prevent overtraining.');
  }

  // Motivation-based
  if (motivation.includes('lose_weight')) {
    recs.push('Combine your workouts with a moderate caloric deficit for sustainable fat loss.');
  }
  if (motivation.includes('build_muscle')) {
    recs.push('Aim for 1.6-2.2g protein per kg bodyweight daily to support muscle growth.');
  }
  if (motivation.includes('sport_performance')) {
    recs.push('Include sport-specific drills alongside general strength and conditioning work.');
  }

  // Frequency-based
  if (frequency >= 6) {
    recs.push('With 6+ sessions per week, include at least one active recovery day (walking, yoga).');
  }

  // Focus-based
  if (focusAreas.includes('flexibility')) {
    recs.push('Hold each stretch for 30-60 seconds and never bounce — breathe into the stretch.');
  }
  if (focusAreas.includes('cardio')) {
    recs.push('Keep cardio sessions in different heart rate zones for balanced endurance gains.');
  }

  // Universal
  recs.push('Stay hydrated: drink water before, during, and after your workouts.');

  return recs;
}

// ---------------------------------------------------------------------------
// Hydration plan generation
// ---------------------------------------------------------------------------

/** Milliliters per glass (standard 250ml). */
const ML_PER_GLASS = 250;

/** Container sizes in ml. */
const CONTAINER_ML: Record<string, number> = {
  glass: 250,
  bottle: 500,
  large_bottle: 750,
  jug: 1000,
};

/** Reminder frequency → minutes between reminders. */
const REMINDER_MINUTES: Record<string, number> = {
  '30min': 30,
  '1h': 60,
  '2h': 120,
  '3h': 180,
};

function generateHydrationPlan(responses: Record<string, any>): HydrationPlan {
  const log = logger.child({ component: 'planGenerator', mode: 'hydration' });

  const dailyTarget: number = parseInt(responses.daily_target, 10) || 8;
  const container: string = responses.container || 'glass';
  const reminderFreq: string = responses.reminder_frequency || '2h';
  const goals: string[] = responses.goals || ['health'];
  const currentIntake: string = responses.current_intake || 'low';

  // Wake/sleep from dual-time quiz step (stored as { wake_time, sleep_time })
  const wakeTime: string = responses.wake_time?.wake_time || responses.wake_time || '08:00';
  const sleepTime: string = responses.wake_time?.sleep_time || responses.sleep_time || '23:00';

  const dailyMl = dailyTarget * ML_PER_GLASS;
  const reminderIntervalMinutes = REMINDER_MINUTES[reminderFreq] || 120;

  const targets: HydrationTargets = {
    dailyGlasses: dailyTarget,
    dailyMl,
    reminderIntervalMinutes,
    wakeTime,
    sleepTime,
  };

  const recommendations = buildHydrationRecommendations(dailyTarget, currentIntake, goals, container);

  log.info('Hydration plan generated', { dailyTarget, dailyMl, reminderIntervalMinutes });

  return {
    mode: 'hydration',
    targets,
    recommendations,
    created_at: new Date().toISOString(),
  };
}

function buildHydrationRecommendations(
  dailyTarget: number,
  currentIntake: string,
  goals: string[],
  container: string,
): string[] {
  const recs: string[] = [];

  // Current-intake-based ramp-up advice
  if (currentIntake === 'very_low' || currentIntake === 'low') {
    recs.push('You are currently drinking less than optimal — increase gradually over 1-2 weeks to avoid discomfort.');
  }

  // Container advice
  const containerMl = CONTAINER_ML[container] || 250;
  const refills = Math.ceil((dailyTarget * ML_PER_GLASS) / containerMl);
  recs.push(`With your ${container.replace('_', ' ')} (${containerMl}ml), aim for about ${refills} refill${refills > 1 ? 's' : ''} per day.`);

  // Goal-based
  if (goals.includes('skin')) {
    recs.push('For skin benefits, spread your water intake evenly throughout the day rather than drinking large amounts at once.');
  }
  if (goals.includes('energy')) {
    recs.push('Drink a full glass of water right after waking up to kickstart your metabolism and energy levels.');
  }
  if (goals.includes('weight_loss')) {
    recs.push('Drink a glass of water 30 minutes before meals — this can help reduce calorie intake.');
  }
  if (goals.includes('athletic')) {
    recs.push('During workouts, drink 200-300ml every 15-20 minutes to maintain performance.');
  }

  // Universal
  recs.push('Keep a water container visible on your desk or near you at all times as a visual reminder.');

  if (dailyTarget >= 12) {
    recs.push('With a high target, consider adding electrolytes to prevent over-dilution, especially in warm weather.');
  }

  return recs;
}
