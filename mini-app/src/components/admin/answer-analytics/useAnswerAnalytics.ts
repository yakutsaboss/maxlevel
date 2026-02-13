import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/api/adminClient';

// ── Types ──────────────────────────────────────────────────────────

export interface QuestionStat {
  key: string;
  label: string;
  responses: Record<string, number>;
  most_common: string;
}

export interface ModeAnalyticsData {
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon: string;
  respondent_count: number;
  questions: QuestionStat[];
}

// ── Human-readable labels for quiz answer keys ─────────────────────

export const ANSWER_LABELS: Record<string, string> = {
  // Fitness
  beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', expert: 'Expert',
  lose_weight: 'Lose Weight', build_muscle: 'Build Muscle', stay_healthy: 'Stay Healthy',
  feel_better: 'Feel Better', sport_performance: 'Sport Performance',
  full_body: 'Full Body', upper_body: 'Upper Body', lower_body: 'Lower Body',
  core: 'Core', cardio: 'Cardio', flexibility: 'Flexibility',
  sedentary: 'Sedentary', light: 'Light', moderate: 'Moderate', very_active: 'Very Active',
  full_gym: 'Full Gym', home_basics: 'Home Basics', bodyweight: 'Bodyweight',
  cardio_machines: 'Cardio Machines', outdoor: 'Outdoor', pool: 'Pool',
  early_morning: 'Early Morning', morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening',
  // Hydration
  very_low: 'Very Low', low: 'Low', average: 'Average', good: 'Good', high: 'High',
  skin: 'Skin Health', energy: 'More Energy', weight_loss: 'Weight Loss',
  health: 'General Health', habit: 'Build Habit', athletic: 'Athletic',
  '30min': 'Every 30 min', '1h': 'Every Hour', '2h': 'Every 2 Hours', '3h': 'Every 3 Hours',
  glass: 'Glass (250ml)', bottle: 'Bottle (500ml)', large_bottle: 'Large (750ml)', jug: 'Jug (1L+)',
  forget: 'Forgetfulness', taste: 'Don\'t Like Taste', access: 'No Access', busy: 'Too Busy', bathroom: 'Bathroom Worries',
  // Medication
  prescription: 'Prescription', otc: 'OTC', supplements: 'Supplements', herbal: 'Herbal',
  both: 'Morning & Evening', multiple: '3+ per Day',
  never_miss: 'Never Miss', track_effects: 'Track Effects', manage_refills: 'Manage Refills', reduce: 'Reduce',
  side_effects: 'Side Effects', cost: 'Cost', too_many: 'Too Many',
  '15min': '15 min Before', '30min_r': '30 min Before', '1hour': '1 Hour Before', exact: 'Exact Time',
  // Finance
  save_more: 'Save More', reduce_debt: 'Reduce Debt', invest: 'Invest',
  budget_better: 'Budget Better', emergency_fund: 'Emergency Fund', track_spending: 'Track Spending',
  student: 'Student', medium: 'Medium',
  prefer_not_to_say: 'Prefer Not to Say',
  food: 'Food', entertainment: 'Entertainment', shopping: 'Shopping',
  transport: 'Transport', subscriptions: 'Subscriptions', other: 'Other',
  daily_tracking: 'Daily', weekly_review: 'Weekly', monthly_only: 'Monthly',
  // Learning
  new_language: 'New Language', programming: 'Programming', reading: 'Reading',
  professional_skills: 'Professional', creativity: 'Creativity', science: 'Science',
  visual: 'Visual', hands_on: 'Hands-On', audio: 'Audio', mixed: 'Mixed',
  books: 'Books', online_courses: 'Online Courses', videos: 'Videos',
  podcasts: 'Podcasts', practice_projects: 'Practice Projects', tutoring: 'Tutoring',
  // Habits
  productivity: 'Productivity', mindfulness: 'Mindfulness', social: 'Social',
  daily: 'Daily', weekdays: 'Weekdays', custom: 'Custom', flexible: 'Flexible',
  time: 'Time-Based', routine: 'Routine', location: 'Location',
  consistency: 'Consistency', replace_bad: 'Replace Bad Habits', track_progress: 'Track Progress',
  motivation: 'Motivation', overwhelmed: 'Overwhelmed',
  // Referral
  tiktok: 'TikTok', instagram: 'Instagram', telegram: 'Telegram', youtube: 'YouTube',
  web: 'Web Search', friend_family: 'Friend/Family',
};

const QUESTION_LABELS: Record<string, string> = {
  // Fitness
  fitness_level: 'Fitness Level', workout_frequency: 'Workout Frequency',
  focus_areas: 'Focus Areas', equipment: 'Equipment', motivation: 'Motivation',
  workout_days: 'Workout Days', activity_level: 'Daily Activity', age: 'Age',
  height: 'Height', current_weight: 'Current Weight', target_weight: 'Goal Weight',
  preferred_time: 'Preferred Time',
  // Hydration
  current_intake: 'Current Intake', goals: 'Goals', daily_target: 'Daily Target',
  reminder_frequency: 'Reminder Frequency', wake_time: 'Wake Time', sleep_time: 'Sleep Time',
  container: 'Drink Vessel',
  // Medication
  medication_count: 'Medication Count', types: 'Medication Types', schedule: 'Schedule',
  reminder_preference: 'Reminder Preference',
  // Finance
  income_level: 'Income Level', spending_categories: 'Biggest Expenses',
  savings_target: 'Savings Target', tracking_frequency: 'Tracking Style',
  // Learning
  learning_style: 'Learning Style', daily_minutes: 'Daily Study Time',
  study_frequency: 'Study Frequency', study_days: 'Study Days', resources: 'Resources',
  // Habits
  frequency: 'Frequency', target_count: 'Habit Count',
  trigger_preference: 'Trigger Type',
  // Common
  referral: 'How Found Us',
};

// ── Helpers ────────────────────────────────────────────────────────

export function formatLabel(key: string): string {
  return ANSWER_LABELS[key] || QUESTION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export function getBarColor(index: number): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  return colors[index % colors.length];
}

export const MODE_TABS = [
  { name: 'fitness', display: 'Fitness', icon: '\u{1F3CB}\u{FE0F}' },
  { name: 'hydration', display: 'Hydration', icon: '\u{1F4A7}' },
  { name: 'medication', display: 'Medication', icon: '\u{1F48A}' },
  { name: 'finance', display: 'Finance', icon: '\u{1F4B0}' },
  { name: 'habits', display: 'Habits', icon: '\u{1F3AF}' },
  { name: 'learning', display: 'Learning', icon: '\u{1F4DA}' },
];

// ── Hook ───────────────────────────────────────────────────────────

export function useAnswerAnalytics(credentials: string) {
  const [data, setData] = useState<ModeAnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState('fitness');
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch('/analytics', credentials);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || `Server returned ${res.status}`);
        return;
      }
      const json = await res.json();
      setData(json.data?.modes || json.modes || []);
    } catch {
      setError('Failed to connect to server');
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const currentMode = data.find(m => m.mode_name === selectedMode);

  const selectMode = (mode: string) => {
    setSelectedMode(mode);
    setExpandedQ(null);
  };

  const toggleQuestion = (key: string) => {
    setExpandedQ(prev => prev === key ? null : key);
  };

  return {
    data,
    loading,
    error,
    selectedMode,
    expandedQ,
    currentMode,
    fetchData,
    selectMode,
    toggleQuestion,
  };
}
