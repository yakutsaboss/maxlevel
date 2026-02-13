/**
 * Shared types for plan generators.
 */

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

/** Generic quiz response map — values are unknown, narrowed at point of use. */
export interface QuizResponses {
  [key: string]: unknown;
}

export interface ModeConfig {
  mode: string;
  quiz_responses: QuizResponses;
}
