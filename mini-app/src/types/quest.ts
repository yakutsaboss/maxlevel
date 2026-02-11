import type { Mode } from './mode.js';

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
