/**
 * ============================================================
 * ONBOARDING QUESTIONS — SINGLE SOURCE OF TRUTH
 * ============================================================
 *
 * This file defines ALL questions and answer options shown
 * during the onboarding flow. To add, edit, or remove a
 * question, modify the arrays below:
 *
 *   FITNESS_QUESTIONS   — 12 questions for Fitness mode
 *   HYDRATION_QUESTIONS — 7 questions for Hydration mode
 *   FINANCE_QUESTIONS   — 5 questions for Finance mode
 *   LEARNING_QUESTIONS  — 5 questions for Learning mode
 *   REFERRAL_OPTIONS    — "How did you find us?" answer choices
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
    title: "What's Your Goal?",
    subtitle: 'What do you want to achieve?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'motivation',
    options: [
      { value: 'lose_weight', label: 'Lose Weight', sublabel: 'Burn fat & slim down' },
      { value: 'build_muscle', label: 'Build Muscle', sublabel: 'Get stronger & bigger' },
      { value: 'stay_healthy', label: 'Stay Healthy', sublabel: 'General wellness' },
      { value: 'feel_better', label: 'Feel Better', sublabel: 'Boost mood & energy' },
      { value: 'sport_performance', label: 'Sports Performance', sublabel: 'Get competitive edge' },
    ],
  },
  {
    step: 'fitness_focus',
    title: 'Focus Areas',
    subtitle: 'Which body parts do you want to work on?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'focus_areas',
    autoSelectAll: 'full_body',
    options: [
      { value: 'full_body', label: 'Full Body', sublabel: 'Everything' },
      { value: 'upper_body', label: 'Upper Body', sublabel: 'Arms, chest & back' },
      { value: 'lower_body', label: 'Lower Body', sublabel: 'Legs & glutes' },
      { value: 'core', label: 'Core', sublabel: 'Abs & stability' },
      { value: 'cardio', label: 'Cardio', sublabel: 'Heart & endurance' },
      { value: 'flexibility', label: 'Flexibility', sublabel: 'Stretching & mobility' },
    ],
  },
  {
    step: 'fitness_level',
    title: 'Your Fitness Level',
    subtitle: 'Where are you right now?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'fitness_level',
    options: [
      { value: 'beginner', label: 'Beginner', sublabel: 'New to working out', icon: '⭐' },
      { value: 'intermediate', label: 'Intermediate', sublabel: 'Some experience', icon: '⭐⭐' },
      { value: 'advanced', label: 'Advanced', sublabel: 'Regular gym-goer', icon: '⭐⭐⭐' },
      { value: 'expert', label: 'Expert', sublabel: 'Years of training', icon: '⭐⭐⭐⭐' },
    ],
  },
  {
    step: 'fitness_activity',
    title: 'Daily Activity',
    subtitle: 'How active is your typical day?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'activity_level',
    options: [
      { value: 'sedentary', label: 'Mostly Sitting', sublabel: 'Desk job, little movement' },
      { value: 'light', label: 'Light Activity', sublabel: 'Some walking throughout the day' },
      { value: 'moderate', label: 'Moderately Active', sublabel: 'Regular movement & walking' },
      { value: 'very_active', label: 'Very Active', sublabel: 'Physically demanding day' },
    ],
  },
  {
    step: 'fitness_age',
    title: 'Your Age',
    subtitle: 'How old are you?',
    type: 'drum-roller',
    dataKey: 'fitness',
    nestedKey: 'age',
    min: 14,
    max: 80,
    defaultValue: 25,
  },
  {
    step: 'fitness_height',
    title: 'Your Height',
    subtitle: 'How tall are you?',
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
    title: 'Current Weight',
    subtitle: 'What do you weigh right now?',
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
    title: 'Goal Weight',
    subtitle: 'What weight do you want to reach?',
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
    title: 'Available Equipment',
    subtitle: 'What do you have access to?',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'equipment',
    options: [
      { value: 'full_gym', label: 'Full Gym', sublabel: 'Machines & free weights' },
      { value: 'home_basics', label: 'Home Setup', sublabel: 'Dumbbells & bands' },
      { value: 'bodyweight', label: 'No Equipment', sublabel: 'Bodyweight only' },
      { value: 'cardio_machines', label: 'Cardio Machines', sublabel: 'Treadmill, bike, etc.' },
      { value: 'outdoor', label: 'Outdoors', sublabel: 'Parks & trails' },
      { value: 'pool', label: 'Pool', sublabel: 'Swimming pool access' },
    ],
  },
  {
    step: 'fitness_frequency',
    title: 'Workout Frequency',
    subtitle: 'How many days per week can you train?',
    type: 'slider',
    dataKey: 'fitness',
    nestedKey: 'workout_frequency',
    min: 1,
    max: 7,
    defaultValue: 4,
    step_size: 1,
    flavorText: {
      '1': 'Easy Start',
      '2': 'Easy Start',
      '3': 'Solid Routine',
      '4': 'Solid Routine',
      '5': 'Serious Commitment',
      '6': 'Serious Commitment',
      '7': 'Full Dedication',
    },
    valueLabel: (v: number) => `${v} workouts a week`,
  },
  {
    step: 'fitness_days',
    title: 'Workout Days',
    subtitle: 'Which days will you train?',
    type: 'day-grid',
    dataKey: 'fitness',
    nestedKey: 'workout_days',
  },
  {
    step: 'fitness_time',
    title: 'Preferred Time',
    subtitle: 'When do you prefer to work out?',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'preferred_time',
    options: [
      { value: 'early_morning', label: 'Early Morning', sublabel: '5:00 - 8:00' },
      { value: 'morning', label: 'Morning', sublabel: '8:00 - 12:00' },
      { value: 'afternoon', label: 'Afternoon', sublabel: '12:00 - 17:00' },
      { value: 'evening', label: 'Evening', sublabel: '17:00 - 22:00' },
    ],
  },
];

export const HYDRATION_QUESTIONS: QuestionConfig[] = [
  {
    step: 'hydration_intake',
    title: 'Current Intake',
    subtitle: 'How much water do you currently drink daily?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'current_intake',
    options: [
      { value: 'very_low', label: 'Almost None', sublabel: 'Less than 2 glasses' },
      { value: 'low', label: 'A Little', sublabel: '2-4 glasses' },
      { value: 'average', label: 'Moderate', sublabel: '4-6 glasses' },
      { value: 'good', label: 'Good Amount', sublabel: '6-8 glasses' },
      { value: 'high', label: 'Plenty', sublabel: '8+ glasses' },
    ],
  },
  {
    step: 'hydration_goals',
    title: 'Why Drink More?',
    subtitle: 'What benefits are you looking for?',
    type: 'multi-select',
    dataKey: 'hydration',
    nestedKey: 'goals',
    options: [
      { value: 'skin', label: 'Better Skin', sublabel: 'Improve skin health' },
      { value: 'energy', label: 'More Energy', sublabel: 'Feel less tired' },
      { value: 'weight_loss', label: 'Weight Management', sublabel: 'Support metabolism' },
      { value: 'health', label: 'General Health', sublabel: 'Overall wellness' },
      { value: 'habit', label: 'Build a Habit', sublabel: 'Consistency is key' },
      { value: 'athletic', label: 'Workout Recovery', sublabel: 'Better performance' },
    ],
  },
  {
    step: 'hydration_target',
    title: 'Daily Water Goal',
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
    title: 'Reminder Frequency',
    subtitle: 'How often should we remind you to drink?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'reminder_frequency',
    options: [
      { value: '30min', label: 'Every 30 min', sublabel: 'Maximum reminders' },
      { value: '1h', label: 'Every 1 hour', sublabel: 'Frequent check-ins' },
      { value: '2h', label: 'Every 2 hours', sublabel: 'Balanced' },
      { value: '3h', label: 'Every 3 hours', sublabel: 'Light reminders' },
    ],
  },
  {
    step: 'hydration_schedule',
    title: 'Your Schedule',
    subtitle: 'When does your day begin and end?',
    type: 'dual-time',
    dataKey: 'hydration',
    nestedKey: 'wake_time',
  },
  {
    step: 'hydration_vessel',
    title: 'Your Drink Size',
    subtitle: 'What do you usually drink from?',
    type: 'single-select',
    dataKey: 'hydration',
    nestedKey: 'container',
    options: [
      { value: 'glass', label: 'Small Glass', sublabel: '250ml' },
      { value: 'bottle', label: 'Water Bottle', sublabel: '500ml' },
      { value: 'large_bottle', label: 'Large Bottle', sublabel: '750ml' },
      { value: 'jug', label: 'Big Jug', sublabel: '1L+' },
    ],
  },
  {
    step: 'hydration_barriers',
    title: "What Gets in the Way?",
    subtitle: 'What makes staying hydrated difficult?',
    type: 'multi-select',
    dataKey: 'pain_points',
    nestedKey: 'hydration',
    options: [
      { value: 'forget', label: 'I Just Forget', sublabel: 'Simply slips my mind' },
      { value: 'taste', label: "Don't Like Water", sublabel: 'Prefer other drinks' },
      { value: 'access', label: 'No Easy Access', sublabel: 'Hard to get water nearby' },
      { value: 'busy', label: 'Too Busy', sublabel: 'No time to stop and drink' },
      { value: 'bathroom', label: 'Bathroom Trips', sublabel: "Don't want frequent breaks" },
    ],
  },
];

export const FINANCE_QUESTIONS: QuestionConfig[] = [
  {
    step: 'finance_goals',
    title: 'Financial Goals',
    subtitle: 'What do you want to achieve?',
    type: 'multi-select',
    dataKey: 'finance',
    nestedKey: 'goals',
    options: [
      { value: 'save_more', label: 'Save More', sublabel: 'Build up savings' },
      { value: 'reduce_debt', label: 'Reduce Debt', sublabel: 'Pay off what you owe' },
      { value: 'invest', label: 'Start Investing', sublabel: 'Grow your money' },
      { value: 'budget_better', label: 'Budget Better', sublabel: 'Know where money goes' },
      { value: 'emergency_fund', label: 'Emergency Fund', sublabel: 'Safety net for surprises' },
      { value: 'track_spending', label: 'Track Spending', sublabel: 'See your habits' },
    ],
  },
  {
    step: 'finance_income',
    title: 'Income Level',
    subtitle: 'What best describes your situation?',
    type: 'single-select',
    dataKey: 'finance',
    nestedKey: 'income_level',
    options: [
      { value: 'student', label: 'Student', sublabel: 'Limited or no income' },
      { value: 'low', label: 'Starting Out', sublabel: 'Entry-level income' },
      { value: 'medium', label: 'Comfortable', sublabel: 'Stable income' },
      { value: 'high', label: 'Well Off', sublabel: 'Strong income' },
      { value: 'prefer_not_to_say', label: 'Prefer Not to Say', sublabel: 'Skip this one' },
    ],
  },
  {
    step: 'finance_spending',
    title: 'Biggest Expenses',
    subtitle: 'Where does most of your money go?',
    type: 'multi-select',
    dataKey: 'finance',
    nestedKey: 'spending_categories',
    options: [
      { value: 'food', label: 'Food & Dining', sublabel: 'Groceries & restaurants' },
      { value: 'entertainment', label: 'Entertainment', sublabel: 'Fun & going out' },
      { value: 'shopping', label: 'Shopping', sublabel: 'Clothes & stuff' },
      { value: 'transport', label: 'Transport', sublabel: 'Car, gas, transit' },
      { value: 'subscriptions', label: 'Subscriptions', sublabel: 'Streaming & apps' },
      { value: 'other', label: 'Other', sublabel: 'Rent, bills, etc.' },
    ],
  },
  {
    step: 'finance_savings_target',
    title: 'Monthly Savings Goal',
    subtitle: 'How much do you want to save per month?',
    type: 'drum-roller',
    dataKey: 'finance',
    nestedKey: 'savings_target',
    min: 0,
    max: 100000,
    defaultValue: 10000,
    formatValue: (v) => v.toLocaleString(),
  },
  {
    step: 'finance_frequency',
    title: 'Tracking Style',
    subtitle: 'How often do you want to review finances?',
    type: 'single-select',
    dataKey: 'finance',
    nestedKey: 'tracking_frequency',
    options: [
      { value: 'daily_tracking', label: 'Daily', sublabel: 'Log every expense' },
      { value: 'weekly_review', label: 'Weekly', sublabel: 'Review once a week' },
      { value: 'monthly_only', label: 'Monthly', sublabel: 'Big picture only' },
    ],
  },
];

export const LEARNING_QUESTIONS: QuestionConfig[] = [
  {
    step: 'learning_goals',
    title: 'Learning Goals',
    subtitle: 'What do you want to learn?',
    type: 'multi-select',
    dataKey: 'learning',
    nestedKey: 'goals',
    options: [
      { value: 'new_language', label: 'New Language', sublabel: 'Learn to speak another language' },
      { value: 'programming', label: 'Programming', sublabel: 'Code & software skills' },
      { value: 'reading', label: 'Read More', sublabel: 'Books & articles' },
      { value: 'professional_skills', label: 'Career Skills', sublabel: 'Level up professionally' },
      { value: 'creativity', label: 'Creativity', sublabel: 'Art, music, writing' },
      { value: 'science', label: 'Science & Math', sublabel: 'STEM knowledge' },
      { value: 'other', label: 'Other', sublabel: 'Something else' },
    ],
  },
  {
    step: 'learning_style',
    title: 'Learning Style',
    subtitle: 'How do you learn best?',
    type: 'single-select',
    dataKey: 'learning',
    nestedKey: 'learning_style',
    options: [
      { value: 'visual', label: 'Visual', sublabel: 'Diagrams & videos', icon: '👁️' },
      { value: 'reading', label: 'Reading', sublabel: 'Books & articles', icon: '📖' },
      { value: 'hands_on', label: 'Hands-On', sublabel: 'Practice & projects', icon: '🛠️' },
      { value: 'audio', label: 'Audio', sublabel: 'Podcasts & lectures', icon: '🎧' },
      { value: 'mixed', label: 'Mixed', sublabel: 'A bit of everything', icon: '🔀' },
    ],
  },
  {
    step: 'learning_time',
    title: 'Daily Study Time',
    subtitle: 'How many minutes per day can you study?',
    type: 'drum-roller',
    dataKey: 'learning',
    nestedKey: 'daily_minutes',
    min: 10,
    max: 180,
    defaultValue: 30,
    formatValue: (v) => {
      if (v >= 60) {
        const h = Math.floor(v / 60);
        const m = v % 60;
        return m > 0 ? `${h}h ${m}min` : `${h} hour${h > 1 ? 's' : ''}`;
      }
      return `${v} min`;
    },
  },
  {
    step: 'learning_frequency',
    title: 'Study Frequency',
    subtitle: 'How many days per week will you study?',
    type: 'slider',
    dataKey: 'learning',
    nestedKey: 'study_frequency',
    min: 1,
    max: 7,
    defaultValue: 5,
    step_size: 1,
    flavorText: {
      '1': 'Easy Start',
      '2': 'Easy Start',
      '3': 'Balanced',
      '4': 'Balanced',
      '5': 'Solid Routine',
      '6': 'Daily Learner',
      '7': 'Full Dedication',
    },
    valueLabel: (v: number) => `${v} days a week`,
  },
  {
    step: 'learning_days',
    title: 'Study Days',
    subtitle: 'Which days will you study?',
    type: 'day-grid',
    dataKey: 'learning',
    nestedKey: 'study_days',
  },
  {
    step: 'learning_resources',
    title: 'Preferred Resources',
    subtitle: 'What tools do you like to use?',
    type: 'multi-select',
    dataKey: 'learning',
    nestedKey: 'resources',
    options: [
      { value: 'books', label: 'Books', sublabel: 'Physical or digital' },
      { value: 'online_courses', label: 'Online Courses', sublabel: 'Coursera, Udemy, etc.' },
      { value: 'videos', label: 'Videos', sublabel: 'YouTube & tutorials' },
      { value: 'podcasts', label: 'Podcasts', sublabel: 'Audio learning' },
      { value: 'practice_projects', label: 'Practice Projects', sublabel: 'Learn by doing' },
      { value: 'tutoring', label: 'Tutoring', sublabel: 'One-on-one help' },
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
  return [...FITNESS_QUESTIONS, ...HYDRATION_QUESTIONS, ...FINANCE_QUESTIONS, ...LEARNING_QUESTIONS].find((q) => q.step === step);
}
