// Achievement types
export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  badge_icon?: string;
  xp_reward: number;
  xp_bonus?: number;
  rarity: string;
  category: string;
  criteria?: Record<string, unknown>;
}

export interface UserAchievement {
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  achievement: Achievement;
}
