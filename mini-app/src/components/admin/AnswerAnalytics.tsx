import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Users, RefreshCw, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { adminFetch } from '@/api/adminClient';

// ── Types ──────────────────────────────────────────────────────────

interface QuestionStat {
  key: string;
  label: string;
  responses: Record<string, number>;
  most_common: string;
}

interface ModeAnalytics {
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon: string;
  respondent_count: number;
  questions: QuestionStat[];
}

interface AnswerAnalyticsProps {
  credentials: string;
}

// ── Human-readable labels for quiz answer keys ─────────────────────

const ANSWER_LABELS: Record<string, string> = {
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

function formatLabel(key: string): string {
  return ANSWER_LABELS[key] || QUESTION_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getBarColor(index: number): string {
  const colors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
  ];
  return colors[index % colors.length];
}

const MODE_TABS = [
  { name: 'fitness', display: 'Fitness', icon: '\u{1F3CB}\u{FE0F}' },
  { name: 'hydration', display: 'Hydration', icon: '\u{1F4A7}' },
  { name: 'medication', display: 'Medication', icon: '\u{1F48A}' },
  { name: 'finance', display: 'Finance', icon: '\u{1F4B0}' },
  { name: 'habits', display: 'Habits', icon: '\u{1F3AF}' },
  { name: 'learning', display: 'Learning', icon: '\u{1F4DA}' },
];

// ── Component ──────────────────────────────────────────────────────

export function AnswerAnalytics({ credentials }: AnswerAnalyticsProps) {
  const [data, setData] = useState<ModeAnalytics[]>([]);
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

  // ── Loading ──

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            Answer Analytics
          </h3>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-24 skeleton" />
        ))}
      </div>
    );
  }

  // ── Error ──

  if (error) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            Answer Analytics
          </h3>
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center space-y-2">
          <BarChart3 size={32} className="text-telegram-hint mx-auto" />
          <p className="text-sm text-telegram-hint">{error}</p>
        </div>
      </div>
    );
  }

  // ── Render ──

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Answer Analytics
        </h3>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {MODE_TABS.map(tab => {
          const modeData = data.find(m => m.mode_name === tab.name);
          const isActive = selectedMode === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => { setSelectedMode(tab.name); setExpandedQ(null); }}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'bg-telegram-secondaryBg text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.display}</span>
              {modeData && (
                <span className={`ml-0.5 text-[10px] ${isActive ? 'opacity-80' : 'opacity-60'}`}>
                  ({modeData.respondent_count})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mode content */}
      {currentMode ? (
        <motion.div
          key={currentMode.mode_name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2"
        >
          {/* Respondent count card */}
          <div className="bg-telegram-secondaryBg rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-telegram-button/10 flex items-center justify-center">
              <Users size={18} className="text-telegram-button" />
            </div>
            <div>
              <div className="text-xl font-bold text-telegram-text">
                {currentMode.respondent_count.toLocaleString()}
              </div>
              <div className="text-xs text-telegram-hint">
                {currentMode.icon} {currentMode.display_name} respondents
              </div>
            </div>
          </div>

          {/* Questions */}
          {currentMode.questions.length === 0 ? (
            <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center">
              <p className="text-sm text-telegram-hint">No response data yet</p>
            </div>
          ) : (
            currentMode.questions.map((q) => {
              const totalResponses = Object.values(q.responses).reduce((a, b) => a + b, 0);
              const isExpanded = expandedQ === q.key;
              const entries = Object.entries(q.responses).sort(([, a], [, b]) => b - a);
              const topEntries = isExpanded ? entries : entries.slice(0, 4);
              const hasMore = entries.length > 4;

              return (
                <div
                  key={q.key}
                  className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2.5"
                >
                  {/* Question header */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-telegram-text">
                      {q.label || formatLabel(q.key)}
                    </div>
                    <div className="text-[10px] text-telegram-hint px-2 py-0.5 bg-telegram-bg rounded-full">
                      {totalResponses} answers
                    </div>
                  </div>

                  {/* Most common answer */}
                  {q.most_common && (
                    <div className="text-xs text-telegram-hint">
                      Most common: <span className="text-telegram-link font-medium">{formatLabel(q.most_common)}</span>
                    </div>
                  )}

                  {/* Distribution bars */}
                  <div className="space-y-1.5">
                    {topEntries.map(([answer, count], idx) => {
                      const pct = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      return (
                        <div key={answer} className="space-y-0.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-telegram-text truncate max-w-[60%]">
                              {formatLabel(answer)}
                            </span>
                            <span className="text-telegram-hint flex-shrink-0 ml-2">
                              {count} ({Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
                            <motion.div
                              className={`h-full rounded-full ${getBarColor(idx)}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ duration: 0.4, delay: idx * 0.05 }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Show more/less */}
                  {hasMore && (
                    <button
                      onClick={() => setExpandedQ(isExpanded ? null : q.key)}
                      className="flex items-center gap-1 text-xs text-telegram-link hover:underline"
                    >
                      <ChevronDown
                        size={12}
                        className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      {isExpanded ? 'Show less' : `Show all ${entries.length} options`}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </motion.div>
      ) : (
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center space-y-2">
          <BarChart3 size={28} className="text-telegram-hint mx-auto" />
          <p className="text-sm text-telegram-hint">
            No analytics data for this mode
          </p>
        </div>
      )}
    </div>
  );
}
