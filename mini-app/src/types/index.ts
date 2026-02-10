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

// Mode types
export interface Mode {
  id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  is_active: boolean;
}

export interface UserMode {
  user_id: number;
  mode_id: number;
  is_active: boolean;
  activated_at: string;
  mode: Mode;
}

// Quest types
export type QuestStatus = 'active' | 'completed' | 'failed' | 'pending';
export type QuestFrequency = 'daily' | 'weekly' | 'monthly' | 'one_time';
export type QuestDifficulty = 'easy' | 'medium' | 'hard';

export interface Quest {
  id: number;
  user_id: number;
  mode_id: number;
  title: string;
  description: string;
  xp_reward: number;
  frequency: QuestFrequency;
  difficulty: QuestDifficulty;
  status: QuestStatus;
  progress: number;
  target: number;
  due_date?: string;
  completed_at?: string;
  mode?: Mode;
}

// Achievement types
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
  rarity: string;
  category: string;
  criteria?: Record<string, any>;
}

export interface UserAchievement {
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  achievement: Achievement;
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Quest completion response
export interface QuestCompleteResponse {
  message: string;
  xpEarned: number;
  newLevel: number;
  leveledUp: boolean;
}

// Check-in response
export interface CheckinResponse {
  check_in_id: number;
  quest_progress: { current: number; target: number };
  completed: boolean;
}

// Check-in list response
export interface CheckinListResponse {
  check_ins: Array<{
    id: number;
    check_in_time: string;
    notes: string | null;
    is_valid: boolean;
    quest_title?: string;
    quest_status?: string;
  }>;
  count: number;
}

// Punishment settings
export interface PunishmentSettings {
  consent_given: boolean;
  consent_timestamp: string | null;
  intensity_level: string;
  safe_mode: boolean;
  custom_punishments: Record<string, any> | null;
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

// User preferences
export interface UserPreferences {
  notification_enabled: boolean;
  reminder_time: number;
  timezone: string;
}

// Onboarding state
export interface OnboardingState {
  current_step: string | null;
  quiz_data: Record<string, any> | null;
}

// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date: number;
    hash: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{ id?: string; type?: string; text: string }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  sendData: (data: string) => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}
