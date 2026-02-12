/**
 * Shared interfaces and formatting helpers for user-stats routes.
 * Extracted from user-stats.ts to keep each module under 200 lines.
 */

// ─── Row interfaces (match SQL query result shapes) ─────────────────

/** Row returned by the active-modes JOIN query */
export interface UserModeRow {
  user_id: number;
  mode_id: number;
  is_active: boolean;
  activated_at: string;
  m_id: number;
  name: string;
  display_name: string;
  description: string;
  icon: string;
}

/** Row returned by quest_instances JOIN quests JOIN modes queries */
export interface ActiveQuestRow {
  id: number;
  user_id: number;
  mode_id: number;
  title: string;
  description: string;
  xp_reward: number;
  frequency: string;
  difficulty: string | null;
  status: string;
  progress: number | null;
  target: number | null;
  due_date: string;
  completed_at: string | null;
  mode_name: string | null;
  mode_display_name: string | null;
  mode_icon: string | null;
}

/** Row returned by user_achievements JOIN achievements queries */
export interface RecentAchievementRow {
  user_id: number;
  achievement_id: number;
  unlocked_at: string;
  name: string;
  description: string;
  icon: string | null;
  xp_reward: number;
  rarity: string;
  category: string;
}

/** Row returned by the per-mode streaks query */
export interface StreakRow {
  mode_id: number;
  current_streak: number;
  longest_streak: number;
  mode_name: string;
  mode_display_name: string;
  mode_icon: string;
}

/** Aggregated stats from the single-row aggregates query */
export interface AggregatesRow {
  completed_today: number;
  xp_today: number;
  days_active: number;
}

// ─── Formatting functions ───────────────────────────────────────────

/** Format a UserModeRow into the API response shape */
export function formatMode(row: UserModeRow) {
  return {
    user_id: row.user_id,
    mode_id: row.mode_id,
    is_active: row.is_active,
    activated_at: row.activated_at,
    mode: {
      id: row.m_id,
      name: row.name,
      display_name: row.display_name,
      description: row.description,
      icon: row.icon,
      is_active: true,
    },
  };
}

/**
 * Format an ActiveQuestRow into the API response shape.
 * @param statusOverride — if provided, used as-is instead of mapping from row.status
 */
export function formatQuest(row: ActiveQuestRow, statusOverride?: string) {
  const status = statusOverride ?? (row.status === 'in_progress' ? 'active' : row.status);
  return {
    id: row.id,
    user_id: row.user_id,
    mode_id: row.mode_id,
    title: row.title,
    description: row.description,
    xp_reward: row.xp_reward,
    frequency: row.frequency === 'daily' ? 'daily' : 'weekly',
    difficulty: row.difficulty || 'medium',
    status,
    progress: row.progress || 0,
    target: row.target || 1,
    due_date: row.due_date,
    completed_at: row.completed_at,
    mode: row.mode_name ? {
      id: row.mode_id,
      name: row.mode_name,
      display_name: row.mode_display_name,
      icon: row.mode_icon,
    } : undefined,
  };
}

/** Format a RecentAchievementRow into the API response shape */
export function formatAchievement(row: RecentAchievementRow) {
  return {
    user_id: row.user_id,
    achievement_id: row.achievement_id,
    unlocked_at: row.unlocked_at,
    achievement: {
      id: row.achievement_id,
      name: row.name,
      description: row.description,
      icon: row.icon || '\u{1F3C6}',
      xp_reward: row.xp_reward,
      rarity: row.rarity,
      category: row.category || '',
    },
  };
}

/** Format a StreakRow into the API response shape */
export function formatStreak(s: StreakRow) {
  return {
    mode_id: s.mode_id,
    mode_name: s.mode_display_name,
    mode_icon: s.mode_icon,
    current_streak: s.current_streak,
    longest_streak: s.longest_streak,
  };
}
