export interface PlayerUser {
  id: number;
  telegram_id: number;
  display_name: string;
  username: string | null;
  first_name: string;
  tier: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
  last_active: string;
  avatar_id: number | null;
  status: string;
}

export interface PlayerMode {
  mode_name: string;
  joined_at: string;
  quest_completion_rate: number;
  current_streak: number;
  quests_completed: number;
  quests_total: number;
}

export interface QuestInstance {
  id: number;
  quest_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  xp_earned: number;
}

export interface PlayerAchievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at: string | null;
}

export interface ActivityEvent {
  id: number;
  type: string;
  description: string;
  xp_earned: number;
  created_at: string;
  icon?: string;
}

export interface PlayerStats {
  total_quests: number;
  total_achievements: number;
  total_activities: number;
  articles_read: number;
  total_xp_earned: number;
  friends_count: number;
  challenges_sent: number;
  challenges_received: number;
  leaderboard_rank: number | null;
}

export interface FinanceSummary {
  has_finance_mode: boolean;
  total_income: number;
  total_expenses: number;
  savings_rate: number;
  budget_count: number;
}

export interface PlayerDetailData {
  user: PlayerUser;
  modes: PlayerMode[];
  recentQuests: QuestInstance[];
  achievements: PlayerAchievement[];
  recentActivities: ActivityEvent[];
  stats: PlayerStats;
  finance: FinanceSummary;
}

export type TabId = 'overview' | 'timeline' | 'modes' | 'quests' | 'achievements' | 'finance' | 'social' | 'actions';
