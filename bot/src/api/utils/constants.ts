/**
 * Shared constants for the RPG bot backend.
 * Use these instead of hardcoded strings in route handlers.
 */

export const QUEST_STATUS = {
  PENDING: 'pending',
  READY: 'ready',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type QuestStatus = typeof QUEST_STATUS[keyof typeof QUEST_STATUS];

export const QUEST_FREQUENCY = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
} as const;

export type QuestFrequency = typeof QUEST_FREQUENCY[keyof typeof QUEST_FREQUENCY];

export const QUEST_DIFFICULTY = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export type QuestDifficulty = typeof QUEST_DIFFICULTY[keyof typeof QUEST_DIFFICULTY];

export const ACHIEVEMENT_RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export type AchievementRarity = typeof ACHIEVEMENT_RARITY[keyof typeof ACHIEVEMENT_RARITY];

export const PUNISHMENT_INTENSITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  EXTREME: 'extreme',
} as const;

export type PunishmentIntensity = typeof PUNISHMENT_INTENSITY[keyof typeof PUNISHMENT_INTENSITY];
