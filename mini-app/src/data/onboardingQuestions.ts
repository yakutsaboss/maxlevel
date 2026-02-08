/**
 * ============================================================
 * ONBOARDING QUESTIONS — SINGLE SOURCE OF TRUTH
 * ============================================================
 *
 * This file defines ALL questions and answer options shown
 * during the onboarding flow. To add, edit, or remove a
 * question, modify the arrays below:
 *
 *   FITNESS_QUESTIONS  — 12 questions for Warrior's Training mode
 *   HYDRATION_QUESTIONS — 7 questions for Aqua Mastery mode
 *   REFERRAL_OPTIONS   — "How did you find us?" answer choices
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

import type { OnboardingStep } from '@/hooks/useOnboarding';

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
  showIf?: (data: Record<string, any>) => boolean;
  // Auto-select behavior
  autoSelectAll?: string;
}

export const FITNESS_QUESTIONS: QuestionConfig[] = [
  {
    step: 'fitness_motivation',
    title: 'Your Battle Cry',
    subtitle: 'What drives your warrior spirit?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'motivation',
    options: [
      { value: 'lose_weight', label: 'Slay the Excess', sublabel: 'Lose weight' },
      { value: 'build_muscle', label: 'Forge Iron', sublabel: 'Build muscle' },
      { value: 'stay_healthy', label: 'Eternal Vitality', sublabel: 'Stay healthy' },
      { value: 'feel_better', label: 'Inner Peace', sublabel: 'Feel better' },
      { value: 'sport_performance', label: "Champion's Edge", sublabel: 'Sport performance' },
    ],
  },
  {
    step: 'fitness_focus',
    title: 'Target Your Training',
    subtitle: 'Which body regions need attention?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'focus_areas',
    autoSelectAll: 'full_body',
    options: [
      { value: 'full_body', label: 'Total Conquest', sublabel: 'Full body' },
      { value: 'upper_body', label: 'Arms & Shield', sublabel: 'Upper body' },
      { value: 'lower_body', label: 'Foundation', sublabel: 'Lower body' },
      { value: 'core', label: 'Iron Core', sublabel: 'Core' },
      { value: 'cardio', label: 'Endurance', sublabel: 'Cardio' },
      { value: 'flexibility', label: 'Swift Movement', sublabel: 'Flexibility' },
    ],
  },
  {
    step: 'fitness_level',
    title: 'Assess Your Power',
    subtitle: 'Where do you stand on your journey?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'fitness_level',
    options: [
      { value: 'beginner', label: 'Recruit', sublabel: 'New to training', icon: '⭐' },
      { value: 'intermediate', label: 'Soldier', sublabel: 'Some experience', icon: '⭐⭐' },
      { value: 'advanced', label: 'Knight', sublabel: 'Experienced fighter', icon: '⭐⭐⭐' },
      { value: 'expert', label: 'Commander', sublabel: 'Battle-hardened veteran', icon: '⭐⭐⭐⭐' },
    ],
  },
  {
    step: 'fitness_activity',
    title: 'Daily Reconnaissance',
    subtitle: 'How active is your current lifestyle?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'activity_level',
    options: [
      { value: 'sedentary', label: 'Tower Guard', sublabel: 'Mostly sitting' },
      { value: 'light', label: 'Scout', sublabel: 'Light movement' },
      { value: 'moderate', label: 'Ranger', sublabel: 'Regular movement' },
      { value: 'very_active', label: 'Berserker', sublabel: 'Physically demanding' },
    ],
  },
  {
    step: 'fitness_age',
    title: 'Years of Service',
    subtitle: 'How many winters have you seen?',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'age',
    min: 14,
    max: 80,
    defaultValue: 25,
  },
  {
    step: 'fitness_height',
    title: 'Measure Your Stature',
    subtitle: 'How tall does your warrior stand?',
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
    title: 'Current Burden',
    subtitle: 'What weight do you carry into battle?',
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
    title: 'Desired Form',
    subtitle: 'What weight would your ideal warrior carry?',
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
    title: 'Your Arsenal',
    subtitle: 'What weapons do you have at your disposal?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'equipment',
    options: [
      { value: 'full_gym', label: 'War Room', sublabel: 'Full gym' },
      { value: 'home_basics', label: 'Home Forge', sublabel: 'Dumbbells & bands' },
      { value: 'bodyweight', label: 'Bare Hands', sublabel: 'No equipment' },
      { value: 'cardio_machines', label: 'Speed Engines', sublabel: 'Treadmill & bike' },
      { value: 'outdoor', label: 'Open Field', sublabel: 'Parks & trails' },
      { value: 'pool', label: 'Aqua Arena', sublabel: 'Pool access' },
    ],
  },
  {
    step: 'fitness_frequency',
    title: 'Training Cadence',
    subtitle: 'How many days per week can you train?',
    type: 'slider',
    dataKey: 'fitness',
    nestedKey: 'workout_frequency',
    min: 1,
    max: 7,
    defaultValue: 4,
    step_size: 1,
    flavorText: {
      '1': 'Light Patrol',
      '2': 'Light Patrol',
      '3': 'Regular Training',
      '4': 'Regular Training',
      '5': 'Intense Campaign',
      '6': 'Intense Campaign',
      '7': 'Total Dedication',
    },
    valueLabel: (v: number) => `${v} workouts a week`,
  },
  {
    step: 'fitness_days',
    title: 'Battle Schedule',
    subtitle: 'Which days will you train?',
    type: 'day-grid',
    dataKey: 'fitness',
    nestedKey: 'workout_days',
  },
  {
    step: 'fitness_time',
    title: 'Hour of Battle',
    subtitle: 'When do you prefer to train?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'preferred_time',
    options: [
      { value: 'early_morning', label: 'Dawn Patrol', sublabel: '5:00 - 8:00' },
      { value: 'morning', label: 'Morning March', sublabel: '8:00 - 12:00' },
      { value: 'afternoon', label: 'Afternoon Assault', sublabel: '12:00 - 17:00' },
      { value: 'evening', label: 'Night Watch', sublabel: '17:00 - 22:00' },
    ],
  },
];

export const HYDRATION_QUESTIONS: QuestionConfig[] = [
  {
    step: 'hydration_intake',
    title: 'Water Audit',
    subtitle: 'How much water do you currently drink daily?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'current_intake',
    options: [
      { value: 'very_low', label: 'Desert Wanderer', sublabel: 'Less than 2 glasses' },
      { value: 'low', label: 'Oasis Seeker', sublabel: '2-4 glasses' },
      { value: 'average', label: 'Stream Walker', sublabel: '4-6 glasses' },
      { value: 'good', label: 'River Keeper', sublabel: '6-8 glasses' },
      { value: 'high', label: 'Ocean Dweller', sublabel: '8+ glasses' },
    ],
  },
  {
    step: 'hydration_goals',
    title: 'Water Quests',
    subtitle: 'Why do you seek the power of water?',
    type: 'multi-select',
    dataKey: 'hydration',
    nestedKey: 'goals',
    options: [
      { value: 'skin', label: 'Crystal Skin', sublabel: 'Improve skin health' },
      { value: 'energy', label: 'Liquid Power', sublabel: 'Boost energy' },
      { value: 'weight_loss', label: 'Aqua Purge', sublabel: 'Weight management' },
      { value: 'health', label: 'Vital Flow', sublabel: 'General health' },
      { value: 'habit', label: 'Water Discipline', sublabel: 'Build habits' },
      { value: 'athletic', label: 'Hydro Boost', sublabel: 'Workout recovery' },
    ],
  },
  {
    step: 'hydration_target',
    title: 'Your Water Goal',
    subtitle: 'How many glasses per day is your target?',
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
    title: 'Alert Cadence',
    subtitle: 'How often should we remind you to drink?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'reminder_frequency',
    options: [
      { value: '30min', label: 'Relentless', sublabel: 'Every 30 minutes' },
      { value: '1h', label: 'Vigilant', sublabel: 'Every 1 hour' },
      { value: '2h', label: 'Steady', sublabel: 'Every 2 hours' },
      { value: '3h', label: 'Relaxed', sublabel: 'Every 3 hours' },
    ],
  },
  {
    step: 'hydration_schedule',
    title: 'Daily Cycle',
    subtitle: 'When does your day begin and end?',
    type: 'dual-time',
    dataKey: 'hydration',
    nestedKey: 'wake_time',
  },
  {
    step: 'hydration_vessel',
    title: 'Your Vessel',
    subtitle: 'What do you usually drink from?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'container',
    options: [
      { value: 'glass', label: 'Crystal Chalice', sublabel: '250ml' },
      { value: 'bottle', label: 'War Flask', sublabel: '500ml' },
      { value: 'large_bottle', label: 'Grand Flask', sublabel: '750ml' },
      { value: 'jug', label: 'Dragon Flagon', sublabel: '1L+' },
    ],
  },
  {
    step: 'hydration_barriers',
    title: 'Water Barriers',
    subtitle: 'What makes staying hydrated difficult?',
    type: 'multi-select',
    dataKey: 'pain_points',
    nestedKey: 'hydration',
    options: [
      { value: 'forget', label: 'Memory Fog', sublabel: 'Simply forget to drink' },
      { value: 'taste', label: 'Tasteless', sublabel: "Don't enjoy water" },
      { value: 'access', label: 'Desert Work', sublabel: 'No easy access' },
      { value: 'busy', label: 'Battle Rush', sublabel: 'Too busy to stop' },
      { value: 'bathroom', label: 'Frequent Stops', sublabel: 'Bathroom trips' },
    ],
  },
];

export const REFERRAL_OPTIONS: QuestionOption[] = [
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'telegram', label: 'Telegram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'web', label: 'Web' },
  { value: 'friend_family', label: 'Friend & Family' },
  { value: 'other', label: 'Other' },
];

export function getQuestionForStep(step: OnboardingStep): QuestionConfig | undefined {
  return [...FITNESS_QUESTIONS, ...HYDRATION_QUESTIONS].find((q) => q.step === step);
}
