export interface QuestTemplate {
  id: number;
  mode_id: number | null;
  title: string;
  description: string | null;
  quest_type: 'daily' | 'weekly';
  xp_reward: number;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  requires_timer: boolean;
  timer_window_start: string | null;
  timer_window_end: string | null;
  readiness_check_enabled: boolean;
  readiness_check_time: string | null;
  is_mandatory: boolean;
  mode_name: string | null;
  mode_display_name: string | null;
  mode_icon: string | null;
}

export interface ModeOption {
  id: number;
  name: string;
  display_name: string;
  icon_emoji: string;
}

export interface QuestFormData {
  mode_id: number | null;
  title: string;
  description: string;
  quest_type: 'daily' | 'weekly';
  xp_reward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  requires_timer: boolean;
  timer_window_start: string;
  timer_window_end: string;
}

export const EMPTY_FORM: QuestFormData = {
  mode_id: null,
  title: '',
  description: '',
  quest_type: 'daily',
  xp_reward: 50,
  difficulty: 'medium',
  requires_timer: false,
  timer_window_start: '',
  timer_window_end: '',
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-green-400 bg-green-500/10',
  medium: 'text-yellow-400 bg-yellow-500/10',
  hard: 'text-red-400 bg-red-500/10',
};
