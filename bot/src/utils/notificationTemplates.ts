/**
 * Rich Telegram Notification Templates
 *
 * Provides HTML-formatted message templates with InlineKeyboard buttons
 * for all notification types: daily summary, quest reminders,
 * achievement unlocks, and streak warnings.
 *
 * All templates use parse_mode: 'HTML' for rich formatting.
 */

import { InlineKeyboard } from 'grammy';

const MINI_APP_URL = process.env.MINI_APP_URL || 'https://yakutsa.ru/levelapp';

// ─── Types ──────────────────────────────────────────────────────────

export interface DailySummaryStats {
  first_name: string | null;
  current_level: number;
  total_xp: number;
  quests_today: number;
  xp_today: number;
  current_streak: number;
}

export interface PendingQuestInfo {
  name?: string;
  mode?: string;
  pending_count: number;
  first_name: string | null;
}

export interface AchievementInfo {
  name: string;
  badge_icon: string;
  xp_bonus: number;
  description: string;
  rarity: string;
  category: string;
  category_earned: number;
  category_total: number;
}

export interface StreakInfo {
  current_streak: number;
  mode_name?: string;
  first_name: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function modeEmoji(mode?: string): string {
  switch (mode?.toLowerCase()) {
    case 'fitness': return '💪';
    case 'hydration': return '💧';
    case 'medication': return '💊';
    case 'finance': return '💰';
    case 'learning': return '📚';
    case 'habits': return '🎯';
    default: return '📋';
  }
}

function rarityBadge(rarity: string): string {
  switch (rarity?.toLowerCase()) {
    case 'common': return '🟢 Common';
    case 'rare': return '🔵 Rare';
    case 'epic': return '🟣 Epic';
    case 'legendary': return '🟡 Legendary';
    default: return rarity || 'Unknown';
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Templates ──────────────────────────────────────────────────────

/**
 * Daily summary notification — rich HTML with XP, quests, streak info.
 */
export function dailySummaryTemplate(stats: DailySummaryStats): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const name = escapeHtml(stats.first_name || 'Adventurer');
  const questsToday = stats.quests_today || 0;
  const xpToday = stats.xp_today || 0;
  const streak = stats.current_streak || 0;

  const lines: string[] = [];

  lines.push(`📊 <b>Daily Summary for ${name}</b>`);
  lines.push('');

  if (questsToday > 0) {
    lines.push(`✅ Quests completed: <b>${questsToday}</b>`);
    lines.push(`⚡ XP earned today: <b>+${xpToday}</b>`);
  } else {
    lines.push('📭 No quests completed yet today.');
  }

  if (streak > 0) {
    lines.push(`🔥 Streak: <b>${streak} day${streak !== 1 ? 's' : ''}</b>`);
  }

  lines.push(`⭐ Level ${stats.current_level} · ${stats.total_xp.toLocaleString()} total XP`);
  lines.push('');

  if (questsToday === 0) {
    lines.push("💪 There's still time! Open the app to find quests.");
  } else if (questsToday >= 3) {
    lines.push("🎉 Amazing work today! You're on fire!");
  } else {
    lines.push('👍 Good progress! Keep the momentum going.');
  }

  const keyboard = new InlineKeyboard()
    .webApp('🎮 Open App', MINI_APP_URL);

  return { text: lines.join('\n'), keyboard };
}

/**
 * Quest reminder — lists pending quests with mode emoji, "Complete Now" button.
 */
export function questReminderTemplate(quest: PendingQuestInfo): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const name = escapeHtml(quest.first_name || 'there');
  const emoji = modeEmoji(quest.mode);
  const count = quest.pending_count;

  const lines: string[] = [];

  lines.push(`${emoji} <b>Quest Reminder</b>`);
  lines.push('');
  lines.push(`Hey ${name}! You have <b>${count}</b> quest${count !== 1 ? 's' : ''} still waiting today.`);
  lines.push('');
  lines.push("Don't break your streak! 🔥");

  const keyboard = new InlineKeyboard()
    .webApp('⚔️ Complete Now', `${MINI_APP_URL}/quests`);

  return { text: lines.join('\n'), keyboard };
}

/**
 * Achievement unlocked — celebration message with rarity badge and XP reward.
 */
export function achievementUnlockedTemplate(achievement: AchievementInfo): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const badge = achievement.badge_icon || '🏆';
  const rarity = rarityBadge(achievement.rarity);
  const category = achievement.category
    ? achievement.category.charAt(0).toUpperCase() + achievement.category.slice(1)
    : '';

  const lines: string[] = [];

  lines.push('🏆 <b>Achievement Unlocked!</b>');
  lines.push('');
  lines.push(`${badge} <b>${escapeHtml(achievement.name)}</b>`);
  lines.push(`${rarity}`);
  lines.push('');
  lines.push(`📝 ${escapeHtml(achievement.description)}`);
  lines.push(`⚡ <b>+${achievement.xp_bonus} XP</b> bonus`);
  lines.push('');
  if (category) {
    lines.push(`📊 ${category}: ${achievement.category_earned}/${achievement.category_total} achievements`);
  }

  const keyboard = new InlineKeyboard()
    .webApp('🏅 View Achievements', `${MINI_APP_URL}/profile`);

  return { text: lines.join('\n'), keyboard };
}

/**
 * Streak at risk warning — urgent message when a streak might break.
 */
// ─── Medication & Streak Milestone Types ─────────────────────────────

export interface MedicationReminderInfo {
  med_name: string;
  dosage: string | null;
}

export interface StreakMilestoneInfo {
  days: number;
  mode: string;
  first_name: string | null;
}

// ─── Medication & Streak Milestone Templates ─────────────────────────

/**
 * Medication reminder — time to take a specific medication.
 */
export function medicationReminderTemplate(info: MedicationReminderInfo): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const name = escapeHtml(info.med_name);
  const dosage = info.dosage ? escapeHtml(info.dosage) : null;

  const lines: string[] = [];

  lines.push('💊 <b>Medication Reminder</b>');
  lines.push('');
  lines.push(`Time for <b>${name}</b>!${dosage ? ` Dosage: <b>${dosage}</b>.` : ''}`);
  lines.push('');
  lines.push('Tap below to mark as taken.');

  const keyboard = new InlineKeyboard()
    .webApp('✅ Mark as Taken', `${MINI_APP_URL}/medications`);

  return { text: lines.join('\n'), keyboard };
}

/**
 * Streak milestone — congratulatory message for hitting 7, 14, 30, 60, or 100 day streak.
 */
export function streakMilestoneTemplate(info: StreakMilestoneInfo): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const name = escapeHtml(info.first_name || 'Adventurer');
  const mode = escapeHtml(info.mode);
  const days = info.days;

  const lines: string[] = [];

  lines.push('🔥 <b>Streak Milestone!</b>');
  lines.push('');
  lines.push(`Congratulations, ${name}! You hit a <b>${days}-day streak</b>!`);
  lines.push(`You're on fire with <b>${mode}</b>! 🎉`);
  lines.push('');

  if (days >= 100) {
    lines.push('🏆 <b>LEGENDARY!</b> 100 days of pure dedication!');
  } else if (days >= 60) {
    lines.push('💎 Two months strong — you\'re unstoppable!');
  } else if (days >= 30) {
    lines.push('🏅 A full month! That\'s real commitment.');
  } else if (days >= 14) {
    lines.push('⭐ Two weeks in — keep the momentum going!');
  } else {
    lines.push('✨ First week milestone! Great start!');
  }

  const keyboard = new InlineKeyboard()
    .webApp('🎮 View Progress', `${MINI_APP_URL}/profile`);

  return { text: lines.join('\n'), keyboard };
}

export function streakWarningTemplate(streak: StreakInfo): {
  text: string;
  keyboard: InlineKeyboard;
} {
  const name = escapeHtml(streak.first_name || 'Adventurer');
  const days = streak.current_streak;
  const mode = streak.mode_name ? escapeHtml(streak.mode_name) : '';

  const lines: string[] = [];

  lines.push('⚠️ <b>Streak at Risk!</b>');
  lines.push('');
  lines.push(`${name}, your <b>${days}-day${mode ? ` ${mode}` : ''} streak</b> is about to break!`);
  lines.push('');
  if (days >= 30) {
    lines.push(`🏅 You've built <b>${days} days</b> of consistency — don't let it slip!`);
  } else if (days >= 7) {
    lines.push(`🔥 ${days} days strong — keep the fire alive!`);
  } else {
    lines.push('💪 Complete a quest now to keep your streak going!');
  }

  const keyboard = new InlineKeyboard()
    .webApp('⚡ Save Streak', `${MINI_APP_URL}/quests`);

  return { text: lines.join('\n'), keyboard };
}
