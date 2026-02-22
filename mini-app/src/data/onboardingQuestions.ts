/**
 * ============================================================
 * ONBOARDING QUESTIONS — SINGLE SOURCE OF TRUTH
 * ============================================================
 *
 * This file defines ALL questions and answer options shown
 * during the onboarding flow. To add, edit, or remove a
 * question, modify the arrays below:
 *
 *   FITNESS_QUESTIONS      — 12 questions for Fitness mode
 *   HYDRATION_QUESTIONS    — 7 questions for Hydration mode
 *   MEDICATION_QUESTIONS   — 6 questions for Medication mode
 *   HABITS_QUESTIONS       — 6 questions for Habits mode
 *
 * All title, subtitle, label, sublabel strings are i18n keys.
 * They get resolved via t() in QuizScreen.tsx's translatedConfig.
 * Actual translations live in: i18n/en.ts, i18n/ru.ts, i18n/zh.ts
 *
 * Player answers are stored in PostgreSQL:
 *   - onboarding_state.quiz_data (JSONB) — all raw answers
 *   - mode_configs.quiz_responses (JSONB) — per-mode answers
 *   - mode_configs.pain_points (JSONB) — e.g. hydration barriers
 *   - punishment_settings — punishment consent & intensity
 *
 * To query all player answers on the server:
 *   PGPASSWORD=postgres psql -h localhost -U postgres -d telegram_rpg \
 *     -c "SELECT u.first_name, os.quiz_data FROM onboarding_state os
 *         JOIN users u ON u.id = os.user_id;"
 *
 * Related files:
 *   - hooks/useOnboarding.ts — Zustand store (step sequence, state)
 *   - pages/Onboarding.tsx — main orchestrator (renders screens)
 *   - components/onboarding/QuizScreen.tsx — generic quiz renderer
 *   - bot/src/api/routes/onboarding.ts — backend API endpoints
 * ============================================================
 */

import type { OnboardingStep, OnboardingData } from '@/hooks/useOnboarding';

export type QuestionType =
  | 'single-select'
  | 'multi-select'
  | 'drum-roller'
  | 'slider'
  | 'day-grid'
  | 'dual-time';

export interface QuestionOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

export interface QuestionConfig {
  step: OnboardingStep;
  title: string;
  subtitle: string;
  type: QuestionType;
  options?: QuestionOption[];
  dataKey: string;
  nestedKey?: string;
  multiSelect?: boolean;
  // Drum roller config
  min?: number;
  max?: number;
  defaultValue?: number;
  unit?: string;
  unitToggle?: { primary: string; secondary: string };
  formatValue?: (v: number) => string;
  // Slider config
  step_size?: number;
  labels?: Record<number, string>;
  flavorText?: Record<string, string>;
  valueLabel?: (v: number) => string;
  valueSuffix?: string;
  // Conditional
  showIf?: (data: OnboardingData) => boolean;
  // Auto-select behavior
  autoSelectAll?: string;
}

export const FITNESS_QUESTIONS: QuestionConfig[] = [
  {
    step: 'fitness_motivation',
    title: 'onboardingQuiz.fitness_motivation.title',
    subtitle: 'onboardingQuiz.fitness_motivation.subtitle',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'motivation',
    options: [
      { value: 'lose_weight', label: 'onboardingQuiz.fitness_motivation.opt.lose_weight', sublabel: 'onboardingQuiz.fitness_motivation.opt.lose_weight_sub' },
      { value: 'build_muscle', label: 'onboardingQuiz.fitness_motivation.opt.build_muscle', sublabel: 'onboardingQuiz.fitness_motivation.opt.build_muscle_sub' },
      { value: 'stay_healthy', label: 'onboardingQuiz.fitness_motivation.opt.stay_healthy', sublabel: 'onboardingQuiz.fitness_motivation.opt.stay_healthy_sub' },
      { value: 'feel_better', label: 'onboardingQuiz.fitness_motivation.opt.feel_better', sublabel: 'onboardingQuiz.fitness_motivation.opt.feel_better_sub' },
      { value: 'sport_performance', label: 'onboardingQuiz.fitness_motivation.opt.sport_performance', sublabel: 'onboardingQuiz.fitness_motivation.opt.sport_performance_sub' },
    ],
  },
  {
    step: 'fitness_focus',
    title: 'onboardingQuiz.fitness_focus.title',
    subtitle: 'onboardingQuiz.fitness_focus.subtitle',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'focus_areas',
    autoSelectAll: 'full_body',
    options: [
      { value: 'full_body', label: 'onboardingQuiz.fitness_focus.opt.full_body', sublabel: 'onboardingQuiz.fitness_focus.opt.full_body_sub' },
      { value: 'upper_body', label: 'onboardingQuiz.fitness_focus.opt.upper_body', sublabel: 'onboardingQuiz.fitness_focus.opt.upper_body_sub' },
      { value: 'lower_body', label: 'onboardingQuiz.fitness_focus.opt.lower_body', sublabel: 'onboardingQuiz.fitness_focus.opt.lower_body_sub' },
      { value: 'core', label: 'onboardingQuiz.fitness_focus.opt.core', sublabel: 'onboardingQuiz.fitness_focus.opt.core_sub' },
      { value: 'cardio', label: 'onboardingQuiz.fitness_focus.opt.cardio', sublabel: 'onboardingQuiz.fitness_focus.opt.cardio_sub' },
      { value: 'flexibility', label: 'onboardingQuiz.fitness_focus.opt.flexibility', sublabel: 'onboardingQuiz.fitness_focus.opt.flexibility_sub' },
    ],
  },
  {
    step: 'fitness_level',
    title: 'onboardingQuiz.fitness_level.title',
    subtitle: 'onboardingQuiz.fitness_level.subtitle',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'fitness_level',
    options: [
      { value: 'beginner', label: 'onboardingQuiz.fitness_level.opt.beginner', sublabel: 'onboardingQuiz.fitness_level.opt.beginner_sub', icon: '⭐' },
      { value: 'intermediate', label: 'onboardingQuiz.fitness_level.opt.intermediate', sublabel: 'onboardingQuiz.fitness_level.opt.intermediate_sub', icon: '⭐⭐' },
      { value: 'advanced', label: 'onboardingQuiz.fitness_level.opt.advanced', sublabel: 'onboardingQuiz.fitness_level.opt.advanced_sub', icon: '⭐⭐⭐' },
      { value: 'expert', label: 'onboardingQuiz.fitness_level.opt.expert', sublabel: 'onboardingQuiz.fitness_level.opt.expert_sub', icon: '⭐⭐⭐⭐' },
    ],
  },
  {
    step: 'fitness_activity',
    title: 'onboardingQuiz.fitness_activity.title',
    subtitle: 'onboardingQuiz.fitness_activity.subtitle',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'activity_level',
    options: [
      { value: 'sedentary', label: 'onboardingQuiz.fitness_activity.opt.sedentary', sublabel: 'onboardingQuiz.fitness_activity.opt.sedentary_sub' },
      { value: 'light', label: 'onboardingQuiz.fitness_activity.opt.light', sublabel: 'onboardingQuiz.fitness_activity.opt.light_sub' },
      { value: 'moderate', label: 'onboardingQuiz.fitness_activity.opt.moderate', sublabel: 'onboardingQuiz.fitness_activity.opt.moderate_sub' },
      { value: 'very_active', label: 'onboardingQuiz.fitness_activity.opt.very_active', sublabel: 'onboardingQuiz.fitness_activity.opt.very_active_sub' },
    ],
  },
  {
    step: 'fitness_age',
    title: 'onboardingQuiz.fitness_age.title',
    subtitle: 'onboardingQuiz.fitness_age.subtitle',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'age',
    min: 14,
    max: 80,
    defaultValue: 25,
  },
  {
    step: 'fitness_height',
    title: 'onboardingQuiz.fitness_height.title',
    subtitle: 'onboardingQuiz.fitness_height.subtitle',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'height',
    min: 140,
    max: 220,
    defaultValue: 175,
    unit: 'cm',
    formatValue: (v) => `${v} cm`,
  },
  {
    step: 'fitness_weight',
    title: 'onboardingQuiz.fitness_weight.title',
    subtitle: 'onboardingQuiz.fitness_weight.subtitle',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'current_weight',
    min: 30,
    max: 200,
    defaultValue: 70,
    unit: 'kg',
    formatValue: (v) => `${v} kg`,
  },
  {
    step: 'fitness_target_weight',
    title: 'onboardingQuiz.fitness_target_weight.title',
    subtitle: 'onboardingQuiz.fitness_target_weight.subtitle',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'target_weight',
    min: 30,
    max: 200,
    defaultValue: 75,
    unit: 'kg',
    formatValue: (v) => `${v} kg`,
    showIf: (data) => {
      const motivation = data.fitness?.motivation || [];
      return motivation.includes('lose_weight') || motivation.includes('build_muscle');
    },
  },
  {
    step: 'fitness_equipment',
    title: 'onboardingQuiz.fitness_equipment.title',
    subtitle: 'onboardingQuiz.fitness_equipment.subtitle',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'equipment',
    options: [
      { value: 'full_gym', label: 'onboardingQuiz.fitness_equipment.opt.full_gym', sublabel: 'onboardingQuiz.fitness_equipment.opt.full_gym_sub' },
      { value: 'home_basics', label: 'onboardingQuiz.fitness_equipment.opt.home_basics', sublabel: 'onboardingQuiz.fitness_equipment.opt.home_basics_sub' },
      { value: 'bodyweight', label: 'onboardingQuiz.fitness_equipment.opt.bodyweight', sublabel: 'onboardingQuiz.fitness_equipment.opt.bodyweight_sub' },
      { value: 'cardio_machines', label: 'onboardingQuiz.fitness_equipment.opt.cardio_machines', sublabel: 'onboardingQuiz.fitness_equipment.opt.cardio_machines_sub' },
      { value: 'outdoor', label: 'onboardingQuiz.fitness_equipment.opt.outdoor', sublabel: 'onboardingQuiz.fitness_equipment.opt.outdoor_sub' },
      { value: 'pool', label: 'onboardingQuiz.fitness_equipment.opt.pool', sublabel: 'onboardingQuiz.fitness_equipment.opt.pool_sub' },
    ],
  },
  {
    step: 'fitness_frequency',
    title: 'onboardingQuiz.fitness_frequency.title',
    subtitle: 'onboardingQuiz.fitness_frequency.subtitle',
    type: 'slider',
    dataKey: 'fitness',
    nestedKey: 'workout_frequency',
    min: 1,
    max: 7,
    defaultValue: 4,
    step_size: 1,
    flavorText: {
      '1': 'onboardingQuiz.flavor.easyStart',
      '2': 'onboardingQuiz.flavor.easyStart',
      '3': 'onboardingQuiz.flavor.solidRoutine',
      '4': 'onboardingQuiz.flavor.solidRoutine',
      '5': 'onboardingQuiz.flavor.seriousCommitment',
      '6': 'onboardingQuiz.flavor.seriousCommitment',
      '7': 'onboardingQuiz.flavor.fullDedication',
    },
    valueSuffix: 'onboardingQuiz.fitness_frequency.suffix',
  },
  {
    step: 'fitness_days',
    title: 'onboardingQuiz.fitness_days.title',
    subtitle: 'onboardingQuiz.fitness_days.subtitle',
    type: 'day-grid',
    dataKey: 'fitness',
    nestedKey: 'workout_days',
  },
  {
    step: 'fitness_time',
    title: 'onboardingQuiz.fitness_time.title',
    subtitle: 'onboardingQuiz.fitness_time.subtitle',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'preferred_time',
    options: [
      { value: 'early_morning', label: 'onboardingQuiz.fitness_time.opt.early_morning', sublabel: '5:00 - 8:00' },
      { value: 'morning', label: 'onboardingQuiz.fitness_time.opt.morning', sublabel: '8:00 - 12:00' },
      { value: 'afternoon', label: 'onboardingQuiz.fitness_time.opt.afternoon', sublabel: '12:00 - 17:00' },
      { value: 'evening', label: 'onboardingQuiz.fitness_time.opt.evening', sublabel: '17:00 - 22:00' },
    ],
  },
];

export const HYDRATION_QUESTIONS: QuestionConfig[] = [
  {
    step: 'hydration_intake',
    title: 'onboardingQuiz.hydration_intake.title',
    subtitle: 'onboardingQuiz.hydration_intake.subtitle',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'current_intake',
    options: [
      { value: 'very_low', label: 'onboardingQuiz.hydration_intake.opt.very_low', sublabel: 'onboardingQuiz.hydration_intake.opt.very_low_sub' },
      { value: 'low', label: 'onboardingQuiz.hydration_intake.opt.low', sublabel: 'onboardingQuiz.hydration_intake.opt.low_sub' },
      { value: 'average', label: 'onboardingQuiz.hydration_intake.opt.average', sublabel: 'onboardingQuiz.hydration_intake.opt.average_sub' },
      { value: 'good', label: 'onboardingQuiz.hydration_intake.opt.good', sublabel: 'onboardingQuiz.hydration_intake.opt.good_sub' },
      { value: 'high', label: 'onboardingQuiz.hydration_intake.opt.high', sublabel: 'onboardingQuiz.hydration_intake.opt.high_sub' },
    ],
  },
  {
    step: 'hydration_goals',
    title: 'onboardingQuiz.hydration_goals.title',
    subtitle: 'onboardingQuiz.hydration_goals.subtitle',
    type: 'multi-select',
    dataKey: 'hydration',
    nestedKey: 'goals',
    options: [
      { value: 'skin', label: 'onboardingQuiz.hydration_goals.opt.skin', sublabel: 'onboardingQuiz.hydration_goals.opt.skin_sub' },
      { value: 'energy', label: 'onboardingQuiz.hydration_goals.opt.energy', sublabel: 'onboardingQuiz.hydration_goals.opt.energy_sub' },
      { value: 'weight_loss', label: 'onboardingQuiz.hydration_goals.opt.weight_loss', sublabel: 'onboardingQuiz.hydration_goals.opt.weight_loss_sub' },
      { value: 'health', label: 'onboardingQuiz.hydration_goals.opt.health', sublabel: 'onboardingQuiz.hydration_goals.opt.health_sub' },
      { value: 'habit', label: 'onboardingQuiz.hydration_goals.opt.habit', sublabel: 'onboardingQuiz.hydration_goals.opt.habit_sub' },
      { value: 'athletic', label: 'onboardingQuiz.hydration_goals.opt.athletic', sublabel: 'onboardingQuiz.hydration_goals.opt.athletic_sub' },
    ],
  },
  {
    step: 'hydration_target',
    title: 'onboardingQuiz.hydration_target.title',
    subtitle: 'onboardingQuiz.hydration_target.subtitle',
    type: 'drum-roller',
    dataKey: 'hydration',
    nestedKey: 'daily_target',
    min: 4,
    max: 20,
    defaultValue: 8,
    formatValue: (v) => {
      const liters = (v * 0.25).toFixed(1);
      return `${v} glasses = ~${liters}L`;
    },
  },
  {
    step: 'hydration_reminder',
    title: 'onboardingQuiz.hydration_reminder.title',
    subtitle: 'onboardingQuiz.hydration_reminder.subtitle',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'reminder_frequency',
    options: [
      { value: '30min', label: 'onboardingQuiz.hydration_reminder.opt.30min', sublabel: 'onboardingQuiz.hydration_reminder.opt.30min_sub' },
      { value: '1h', label: 'onboardingQuiz.hydration_reminder.opt.1h', sublabel: 'onboardingQuiz.hydration_reminder.opt.1h_sub' },
      { value: '2h', label: 'onboardingQuiz.hydration_reminder.opt.2h', sublabel: 'onboardingQuiz.hydration_reminder.opt.2h_sub' },
      { value: '3h', label: 'onboardingQuiz.hydration_reminder.opt.3h', sublabel: 'onboardingQuiz.hydration_reminder.opt.3h_sub' },
    ],
  },
  {
    step: 'hydration_schedule',
    title: 'onboardingQuiz.hydration_schedule.title',
    subtitle: 'onboardingQuiz.hydration_schedule.subtitle',
    type: 'dual-time',
    dataKey: 'hydration',
    nestedKey: 'wake_time',
  },
  {
    step: 'hydration_vessel',
    title: 'onboardingQuiz.hydration_vessel.title',
    subtitle: 'onboardingQuiz.hydration_vessel.subtitle',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'container',
    options: [
      { value: 'glass', label: 'onboardingQuiz.hydration_vessel.opt.glass', sublabel: '250ml' },
      { value: 'bottle', label: 'onboardingQuiz.hydration_vessel.opt.bottle', sublabel: '500ml' },
      { value: 'large_bottle', label: 'onboardingQuiz.hydration_vessel.opt.large_bottle', sublabel: '750ml' },
      { value: 'jug', label: 'onboardingQuiz.hydration_vessel.opt.jug', sublabel: '1L+' },
    ],
  },
  {
    step: 'hydration_barriers',
    title: 'onboardingQuiz.hydration_barriers.title',
    subtitle: 'onboardingQuiz.hydration_barriers.subtitle',
    type: 'multi-select',
    dataKey: 'pain_points',
    nestedKey: 'hydration',
    options: [
      { value: 'forget', label: 'onboardingQuiz.hydration_barriers.opt.forget', sublabel: 'onboardingQuiz.hydration_barriers.opt.forget_sub' },
      { value: 'taste', label: 'onboardingQuiz.hydration_barriers.opt.taste', sublabel: 'onboardingQuiz.hydration_barriers.opt.taste_sub' },
      { value: 'access', label: 'onboardingQuiz.hydration_barriers.opt.access', sublabel: 'onboardingQuiz.hydration_barriers.opt.access_sub' },
      { value: 'busy', label: 'onboardingQuiz.hydration_barriers.opt.busy', sublabel: 'onboardingQuiz.hydration_barriers.opt.busy_sub' },
      { value: 'bathroom', label: 'onboardingQuiz.hydration_barriers.opt.bathroom', sublabel: 'onboardingQuiz.hydration_barriers.opt.bathroom_sub' },
    ],
  },
];

export const MEDICATION_QUESTIONS: QuestionConfig[] = [
  {
    step: 'medication_count',
    title: 'onboardingQuiz.medication_count.title',
    subtitle: 'onboardingQuiz.medication_count.subtitle',
    type: 'single-select',
    dataKey: 'medication',
    nestedKey: 'medication_count',
    options: [
      { value: '1', label: 'onboardingQuiz.medication_count.opt.1', sublabel: 'onboardingQuiz.medication_count.opt.1_sub' },
      { value: '2-3', label: 'onboardingQuiz.medication_count.opt.2_3', sublabel: 'onboardingQuiz.medication_count.opt.2_3_sub' },
      { value: '4-6', label: 'onboardingQuiz.medication_count.opt.4_6', sublabel: 'onboardingQuiz.medication_count.opt.4_6_sub' },
      { value: '7+', label: 'onboardingQuiz.medication_count.opt.7_plus', sublabel: 'onboardingQuiz.medication_count.opt.7_plus_sub' },
    ],
  },
  {
    step: 'medication_types',
    title: 'onboardingQuiz.medication_types.title',
    subtitle: 'onboardingQuiz.medication_types.subtitle',
    type: 'multi-select',
    dataKey: 'medication',
    nestedKey: 'types',
    options: [
      { value: 'prescription', label: 'onboardingQuiz.medication_types.opt.prescription', sublabel: 'onboardingQuiz.medication_types.opt.prescription_sub' },
      { value: 'otc', label: 'onboardingQuiz.medication_types.opt.otc', sublabel: 'onboardingQuiz.medication_types.opt.otc_sub' },
      { value: 'supplements', label: 'onboardingQuiz.medication_types.opt.supplements', sublabel: 'onboardingQuiz.medication_types.opt.supplements_sub' },
      { value: 'herbal', label: 'onboardingQuiz.medication_types.opt.herbal', sublabel: 'onboardingQuiz.medication_types.opt.herbal_sub' },
    ],
  },
  {
    step: 'medication_schedule',
    title: 'onboardingQuiz.medication_schedule.title',
    subtitle: 'onboardingQuiz.medication_schedule.subtitle',
    type: 'single-select',
    dataKey: 'medication',
    nestedKey: 'schedule',
    options: [
      { value: 'morning', label: 'onboardingQuiz.medication_schedule.opt.morning', sublabel: 'onboardingQuiz.medication_schedule.opt.morning_sub' },
      { value: 'evening', label: 'onboardingQuiz.medication_schedule.opt.evening', sublabel: 'onboardingQuiz.medication_schedule.opt.evening_sub' },
      { value: 'both', label: 'onboardingQuiz.medication_schedule.opt.both', sublabel: 'onboardingQuiz.medication_schedule.opt.both_sub' },
      { value: 'multiple', label: 'onboardingQuiz.medication_schedule.opt.multiple', sublabel: 'onboardingQuiz.medication_schedule.opt.multiple_sub' },
    ],
  },
  {
    step: 'medication_goals',
    title: 'onboardingQuiz.medication_goals.title',
    subtitle: 'onboardingQuiz.medication_goals.subtitle',
    type: 'multi-select',
    dataKey: 'medication',
    nestedKey: 'goals',
    options: [
      { value: 'never_miss', label: 'onboardingQuiz.medication_goals.opt.never_miss', sublabel: 'onboardingQuiz.medication_goals.opt.never_miss_sub' },
      { value: 'track_effects', label: 'onboardingQuiz.medication_goals.opt.track_effects', sublabel: 'onboardingQuiz.medication_goals.opt.track_effects_sub' },
      { value: 'manage_refills', label: 'onboardingQuiz.medication_goals.opt.manage_refills', sublabel: 'onboardingQuiz.medication_goals.opt.manage_refills_sub' },
      { value: 'reduce', label: 'onboardingQuiz.medication_goals.opt.reduce', sublabel: 'onboardingQuiz.medication_goals.opt.reduce_sub' },
    ],
  },
  {
    step: 'medication_barriers',
    title: 'onboardingQuiz.medication_barriers.title',
    subtitle: 'onboardingQuiz.medication_barriers.subtitle',
    type: 'multi-select',
    dataKey: 'pain_points',
    nestedKey: 'medication',
    options: [
      { value: 'forget', label: 'onboardingQuiz.medication_barriers.opt.forget', sublabel: 'onboardingQuiz.medication_barriers.opt.forget_sub' },
      { value: 'side_effects', label: 'onboardingQuiz.medication_barriers.opt.side_effects', sublabel: 'onboardingQuiz.medication_barriers.opt.side_effects_sub' },
      { value: 'cost', label: 'onboardingQuiz.medication_barriers.opt.cost', sublabel: 'onboardingQuiz.medication_barriers.opt.cost_sub' },
      { value: 'too_many', label: 'onboardingQuiz.medication_barriers.opt.too_many', sublabel: 'onboardingQuiz.medication_barriers.opt.too_many_sub' },
    ],
  },
  {
    step: 'medication_reminders',
    title: 'onboardingQuiz.medication_reminders.title',
    subtitle: 'onboardingQuiz.medication_reminders.subtitle',
    type: 'single-select',
    dataKey: 'medication',
    nestedKey: 'reminder_preference',
    options: [
      { value: '15min', label: 'onboardingQuiz.medication_reminders.opt.15min', sublabel: 'onboardingQuiz.medication_reminders.opt.15min_sub' },
      { value: '30min', label: 'onboardingQuiz.medication_reminders.opt.30min', sublabel: 'onboardingQuiz.medication_reminders.opt.30min_sub' },
      { value: '1hour', label: 'onboardingQuiz.medication_reminders.opt.1hour', sublabel: 'onboardingQuiz.medication_reminders.opt.1hour_sub' },
      { value: 'exact', label: 'onboardingQuiz.medication_reminders.opt.exact', sublabel: 'onboardingQuiz.medication_reminders.opt.exact_sub' },
    ],
  },
];

export const HABITS_QUESTIONS: QuestionConfig[] = [
  {
    step: 'habits_type',
    title: 'onboardingQuiz.habits_type.title',
    subtitle: 'onboardingQuiz.habits_type.subtitle',
    type: 'multi-select',
    dataKey: 'habits',
    nestedKey: 'types',
    options: [
      { value: 'health', label: 'onboardingQuiz.habits_type.opt.health', sublabel: 'onboardingQuiz.habits_type.opt.health_sub' },
      { value: 'productivity', label: 'onboardingQuiz.habits_type.opt.productivity', sublabel: 'onboardingQuiz.habits_type.opt.productivity_sub' },
      { value: 'mindfulness', label: 'onboardingQuiz.habits_type.opt.mindfulness', sublabel: 'onboardingQuiz.habits_type.opt.mindfulness_sub' },
      { value: 'social', label: 'onboardingQuiz.habits_type.opt.social', sublabel: 'onboardingQuiz.habits_type.opt.social_sub' },
    ],
  },
  {
    step: 'habits_frequency',
    title: 'onboardingQuiz.habits_frequency.title',
    subtitle: 'onboardingQuiz.habits_frequency.subtitle',
    type: 'single-select',
    dataKey: 'habits',
    nestedKey: 'frequency',
    options: [
      { value: 'daily', label: 'onboardingQuiz.habits_frequency.opt.daily', sublabel: 'onboardingQuiz.habits_frequency.opt.daily_sub' },
      { value: 'weekdays', label: 'onboardingQuiz.habits_frequency.opt.weekdays', sublabel: 'onboardingQuiz.habits_frequency.opt.weekdays_sub' },
      { value: 'custom', label: 'onboardingQuiz.habits_frequency.opt.custom', sublabel: 'onboardingQuiz.habits_frequency.opt.custom_sub' },
      { value: 'flexible', label: 'onboardingQuiz.habits_frequency.opt.flexible', sublabel: 'onboardingQuiz.habits_frequency.opt.flexible_sub' },
    ],
  },
  {
    step: 'habits_count',
    title: 'onboardingQuiz.habits_count.title',
    subtitle: 'onboardingQuiz.habits_count.subtitle',
    type: 'drum-roller',
    dataKey: 'habits',
    nestedKey: 'target_count',
    min: 1,
    max: 10,
    defaultValue: 3,
    formatValue: (v) => v === 1 ? '1 habit' : `${v} habits`,
  },
  {
    step: 'habits_trigger',
    title: 'onboardingQuiz.habits_trigger.title',
    subtitle: 'onboardingQuiz.habits_trigger.subtitle',
    type: 'single-select',
    dataKey: 'habits',
    nestedKey: 'trigger_preference',
    options: [
      { value: 'time', label: 'onboardingQuiz.habits_trigger.opt.time', sublabel: 'onboardingQuiz.habits_trigger.opt.time_sub' },
      { value: 'routine', label: 'onboardingQuiz.habits_trigger.opt.routine', sublabel: 'onboardingQuiz.habits_trigger.opt.routine_sub' },
      { value: 'location', label: 'onboardingQuiz.habits_trigger.opt.location', sublabel: 'onboardingQuiz.habits_trigger.opt.location_sub' },
      { value: 'social', label: 'onboardingQuiz.habits_trigger.opt.social', sublabel: 'onboardingQuiz.habits_trigger.opt.social_sub' },
    ],
  },
  {
    step: 'habits_goals',
    title: 'onboardingQuiz.habits_goals.title',
    subtitle: 'onboardingQuiz.habits_goals.subtitle',
    type: 'multi-select',
    dataKey: 'habits',
    nestedKey: 'goals',
    options: [
      { value: 'consistency', label: 'onboardingQuiz.habits_goals.opt.consistency', sublabel: 'onboardingQuiz.habits_goals.opt.consistency_sub' },
      { value: 'replace_bad', label: 'onboardingQuiz.habits_goals.opt.replace_bad', sublabel: 'onboardingQuiz.habits_goals.opt.replace_bad_sub' },
      { value: 'track_progress', label: 'onboardingQuiz.habits_goals.opt.track_progress', sublabel: 'onboardingQuiz.habits_goals.opt.track_progress_sub' },
      { value: 'feel_better', label: 'onboardingQuiz.habits_goals.opt.feel_better', sublabel: 'onboardingQuiz.habits_goals.opt.feel_better_sub' },
    ],
  },
  {
    step: 'habits_barriers',
    title: 'onboardingQuiz.habits_barriers.title',
    subtitle: 'onboardingQuiz.habits_barriers.subtitle',
    type: 'multi-select',
    dataKey: 'pain_points',
    nestedKey: 'habits',
    options: [
      { value: 'motivation', label: 'onboardingQuiz.habits_barriers.opt.motivation', sublabel: 'onboardingQuiz.habits_barriers.opt.motivation_sub' },
      { value: 'forget', label: 'onboardingQuiz.habits_barriers.opt.forget', sublabel: 'onboardingQuiz.habits_barriers.opt.forget_sub' },
      { value: 'time', label: 'onboardingQuiz.habits_barriers.opt.time', sublabel: 'onboardingQuiz.habits_barriers.opt.time_sub' },
      { value: 'overwhelmed', label: 'onboardingQuiz.habits_barriers.opt.overwhelmed', sublabel: 'onboardingQuiz.habits_barriers.opt.overwhelmed_sub' },
    ],
  },
];

export function getQuestionForStep(step: OnboardingStep): QuestionConfig | undefined {
  return [...FITNESS_QUESTIONS, ...HYDRATION_QUESTIONS, ...MEDICATION_QUESTIONS, ...HABITS_QUESTIONS].find((q) => q.step === step);
}
