import type { Quest } from './quest.js';
import type { UserMode } from './mode.js';
import type { UserAchievement } from './achievement.js';

// User types
export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  level: number;
  xp: number;
  xp_to_next_level: number;
  total_quests_completed: number;
  current_streak: number;
  longest_streak: number;
  avatar_id?: number;
  created_at: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  user_id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  level: number;
  total_xp: number;
  avatar_id?: number;
  weekly_xp?: number;
  monthly_xp?: number;
  current_streak: number;
  total_quests_completed: number;
  xp_rank: number;
  level_rank: number;
}

// Stats types
export interface UserStats {
  user: User;
  modes: UserMode[];
  activeQuests: Quest[];
  completedQuestsToday: number;
  recentAchievements: UserAchievement[];
  xpGainedToday: number;
  streakData: {
    current: number;
    longest: number;
    daysActive: number;
  };
  perModeStreaks?: Array<{
    mode_id: number;
    mode_name: string;
    mode_icon: string;
    current_streak: number;
    longest_streak: number;
  }>;
}

// User preferences
export interface UserPreferences {
  notification_enabled: boolean;
  reminder_time: number;
  timezone: string;
  dnd_enabled?: boolean;
  dnd_start?: number;
  dnd_end?: number;
}

// Onboarding state
export interface OnboardingState {
  current_step: string | null;
  quiz_data: Record<string, unknown> | null;
}

// Punishment settings
export interface PunishmentSettings {
  consent_given: boolean;
  consent_timestamp: string | null;
  intensity_level: string;
  safe_mode: boolean;
  custom_punishments: Record<string, unknown> | null;
  max_xp_penalty: number;
  max_streak_reset: number;
}

// Punishment history entry
export interface PunishmentHistoryResponse {
  punishments: Array<{
    id: number;
    quest_instance_id: number | null;
    punishment_type: string;
    severity: string;
    xp_deducted: number;
    streak_days_lost: number;
    message_sent: string;
    notes: string;
    applied_at: string;
    quest_title?: string;
  }>;
  page: number;
  total: number;
}
