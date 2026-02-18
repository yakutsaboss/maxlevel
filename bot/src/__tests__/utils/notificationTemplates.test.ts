/**
 * Tests for Notification Templates (bot/src/utils/notificationTemplates.ts)
 *
 * Run 73 Agent D: Tests each template for valid HTML output and InlineKeyboard.
 * Covers: dailySummaryTemplate, questReminderTemplate, achievementUnlockedTemplate,
 * streakWarningTemplate, helper functions (escapeHtml, modeEmoji, rarityBadge).
 */

import { describe, it, expect } from 'vitest';
import {
  dailySummaryTemplate,
  questReminderTemplate,
  achievementUnlockedTemplate,
  streakWarningTemplate,
  type DailySummaryStats,
  type PendingQuestInfo,
  type AchievementInfo,
  type StreakInfo,
} from '../../utils/notificationTemplates.js';

// ─── Helpers ────────────────────────────────────────────────────────

/** Verify that a template result contains valid HTML and an InlineKeyboard */
function expectValidTemplate(result: { text: string; keyboard: any }) {
  expect(result.text).toBeTruthy();
  expect(typeof result.text).toBe('string');
  // Must contain at least one HTML tag
  expect(result.text).toMatch(/<\/?b>|<\/?i>|<\/?code>/);
  // Keyboard must be an InlineKeyboard instance with inline_keyboard array
  expect(result.keyboard).toBeDefined();
  expect(result.keyboard.inline_keyboard).toBeInstanceOf(Array);
  expect(result.keyboard.inline_keyboard.length).toBeGreaterThan(0);
}

// ─── dailySummaryTemplate ───────────────────────────────────────────

describe('dailySummaryTemplate', () => {
  const baseStats: DailySummaryStats = {
    first_name: 'Alice',
    current_level: 5,
    total_xp: 1200,
    quests_today: 3,
    xp_today: 150,
    current_streak: 7,
  };

  it('returns valid HTML with inline keyboard', () => {
    const result = dailySummaryTemplate(baseStats);
    expectValidTemplate(result);
  });

  it('includes user name in message', () => {
    const result = dailySummaryTemplate(baseStats);
    expect(result.text).toContain('Alice');
  });

  it('uses "Adventurer" when first_name is null', () => {
    const result = dailySummaryTemplate({ ...baseStats, first_name: null });
    expect(result.text).toContain('Adventurer');
  });

  it('shows quest count and XP when quests completed', () => {
    const result = dailySummaryTemplate(baseStats);
    expect(result.text).toContain('3');
    expect(result.text).toContain('+150');
  });

  it('shows "no quests" message when quests_today is 0', () => {
    const result = dailySummaryTemplate({ ...baseStats, quests_today: 0, xp_today: 0 });
    expect(result.text).toContain('No quests completed');
  });

  it('shows streak count when streak > 0', () => {
    const result = dailySummaryTemplate(baseStats);
    expect(result.text).toContain('7 days');
  });

  it('uses singular "day" for streak of 1', () => {
    const result = dailySummaryTemplate({ ...baseStats, current_streak: 1 });
    expect(result.text).toMatch(/1 day\b/);
  });

  it('shows level and total XP', () => {
    const result = dailySummaryTemplate(baseStats);
    expect(result.text).toContain('Level 5');
    // toLocaleString() formatting varies by environment (comma, dot, space, or nothing)
    expect(result.text).toMatch(/1[,.\s]?200/);
  });

  it('shows motivational message for 3+ quests', () => {
    const result = dailySummaryTemplate(baseStats);
    expect(result.text).toContain('Amazing work');
  });

  it('shows encouragement for 1-2 quests', () => {
    const result = dailySummaryTemplate({ ...baseStats, quests_today: 2 });
    expect(result.text).toContain('Good progress');
  });

  it('shows call-to-action for 0 quests', () => {
    const result = dailySummaryTemplate({ ...baseStats, quests_today: 0 });
    expect(result.text).toContain('still time');
  });

  it('keyboard has Open App button', () => {
    const result = dailySummaryTemplate(baseStats);
    const buttons = result.keyboard.inline_keyboard.flat();
    expect(buttons.some((b: any) => b.text?.includes('Open App') && b.web_app)).toBe(true);
  });

  it('escapes HTML special characters in name', () => {
    const result = dailySummaryTemplate({ ...baseStats, first_name: '<script>alert(1)</script>' });
    expect(result.text).not.toContain('<script>');
    expect(result.text).toContain('&lt;script&gt;');
  });
});

// ─── questReminderTemplate ──────────────────────────────────────────

describe('questReminderTemplate', () => {
  const baseQuest: PendingQuestInfo = {
    first_name: 'Bob',
    pending_count: 3,
    mode: 'fitness',
    name: 'Morning Workout',
  };

  it('returns valid HTML with inline keyboard', () => {
    const result = questReminderTemplate(baseQuest);
    expectValidTemplate(result);
  });

  it('includes user name', () => {
    const result = questReminderTemplate(baseQuest);
    expect(result.text).toContain('Bob');
  });

  it('uses "there" when first_name is null', () => {
    const result = questReminderTemplate({ ...baseQuest, first_name: null });
    expect(result.text).toContain('there');
  });

  it('shows pending quest count', () => {
    const result = questReminderTemplate(baseQuest);
    expect(result.text).toContain('3');
    expect(result.text).toContain('quests');
  });

  it('uses singular "quest" for count of 1', () => {
    const result = questReminderTemplate({ ...baseQuest, pending_count: 1 });
    expect(result.text).toMatch(/1<\/b> quest\b/);
  });

  it('uses fitness emoji for fitness mode', () => {
    const result = questReminderTemplate(baseQuest);
    expect(result.text).toContain('💪');
  });

  it('uses hydration emoji for hydration mode', () => {
    const result = questReminderTemplate({ ...baseQuest, mode: 'hydration' });
    expect(result.text).toContain('💧');
  });

  it('uses medication emoji for medication mode', () => {
    const result = questReminderTemplate({ ...baseQuest, mode: 'medication' });
    expect(result.text).toContain('💊');
  });

  it('uses default emoji when mode is undefined', () => {
    const result = questReminderTemplate({ ...baseQuest, mode: undefined });
    expect(result.text).toContain('📋');
  });

  it('includes streak motivation text', () => {
    const result = questReminderTemplate(baseQuest);
    expect(result.text).toContain('streak');
  });

  it('keyboard has Complete Now button linking to quests', () => {
    const result = questReminderTemplate(baseQuest);
    const buttons = result.keyboard.inline_keyboard.flat();
    expect(buttons.some((b: any) => b.text?.includes('Complete Now') && b.web_app?.url?.includes('/quests'))).toBe(true);
  });
});

// ─── achievementUnlockedTemplate ────────────────────────────────────

describe('achievementUnlockedTemplate', () => {
  const baseAchievement: AchievementInfo = {
    name: 'Streak Master',
    badge_icon: '🔥',
    xp_bonus: 100,
    description: 'Maintained a 7-day streak',
    rarity: 'rare',
    category: 'streak',
    category_earned: 3,
    category_total: 10,
  };

  it('returns valid HTML with inline keyboard', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expectValidTemplate(result);
  });

  it('includes achievement name', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('Streak Master');
  });

  it('includes badge icon', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('🔥');
  });

  it('includes XP bonus', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('+100 XP');
  });

  it('includes description', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('Maintained a 7-day streak');
  });

  it('shows rarity badge for common', () => {
    const result = achievementUnlockedTemplate({ ...baseAchievement, rarity: 'common' });
    expect(result.text).toContain('🟢 Common');
  });

  it('shows rarity badge for rare', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('🔵 Rare');
  });

  it('shows rarity badge for epic', () => {
    const result = achievementUnlockedTemplate({ ...baseAchievement, rarity: 'epic' });
    expect(result.text).toContain('🟣 Epic');
  });

  it('shows rarity badge for legendary', () => {
    const result = achievementUnlockedTemplate({ ...baseAchievement, rarity: 'legendary' });
    expect(result.text).toContain('🟡 Legendary');
  });

  it('shows category progress', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    expect(result.text).toContain('Streak');
    expect(result.text).toContain('3/10');
  });

  it('uses default badge icon when empty', () => {
    const result = achievementUnlockedTemplate({ ...baseAchievement, badge_icon: '' });
    expect(result.text).toContain('🏆');
  });

  it('escapes HTML in achievement name', () => {
    const result = achievementUnlockedTemplate({ ...baseAchievement, name: '<b>Hacker</b>' });
    expect(result.text).toContain('&lt;b&gt;Hacker&lt;/b&gt;');
  });

  it('keyboard has View Achievements button linking to profile', () => {
    const result = achievementUnlockedTemplate(baseAchievement);
    const buttons = result.keyboard.inline_keyboard.flat();
    expect(buttons.some((b: any) => b.text?.includes('View Achievements') && b.web_app?.url?.includes('/profile'))).toBe(true);
  });
});

// ─── streakWarningTemplate ──────────────────────────────────────────

describe('streakWarningTemplate', () => {
  const baseStreak: StreakInfo = {
    current_streak: 14,
    mode_name: 'fitness',
    first_name: 'Carol',
  };

  it('returns valid HTML with inline keyboard', () => {
    const result = streakWarningTemplate(baseStreak);
    expectValidTemplate(result);
  });

  it('includes user name', () => {
    const result = streakWarningTemplate(baseStreak);
    expect(result.text).toContain('Carol');
  });

  it('uses "Adventurer" when first_name is null', () => {
    const result = streakWarningTemplate({ ...baseStreak, first_name: null });
    expect(result.text).toContain('Adventurer');
  });

  it('shows streak day count', () => {
    const result = streakWarningTemplate(baseStreak);
    expect(result.text).toContain('14-day');
  });

  it('includes mode name in streak description', () => {
    const result = streakWarningTemplate(baseStreak);
    expect(result.text).toContain('fitness');
  });

  it('works without mode name', () => {
    const result = streakWarningTemplate({ ...baseStreak, mode_name: undefined });
    expect(result.text).toContain('14-day');
    expect(result.text).toContain('streak');
  });

  it('shows 30+ day motivational message for long streaks', () => {
    const result = streakWarningTemplate({ ...baseStreak, current_streak: 35 });
    expect(result.text).toContain('35 days');
    expect(result.text).toContain('consistency');
  });

  it('shows 7-29 day motivational message for medium streaks', () => {
    const result = streakWarningTemplate(baseStreak); // 14 days
    expect(result.text).toContain('14 days strong');
  });

  it('shows short streak encouragement for < 7 days', () => {
    const result = streakWarningTemplate({ ...baseStreak, current_streak: 3 });
    expect(result.text).toContain('Complete a quest');
  });

  it('includes "Streak at Risk" header', () => {
    const result = streakWarningTemplate(baseStreak);
    expect(result.text).toContain('Streak at Risk');
  });

  it('keyboard has Save Streak button linking to quests', () => {
    const result = streakWarningTemplate(baseStreak);
    const buttons = result.keyboard.inline_keyboard.flat();
    expect(buttons.some((b: any) => b.text?.includes('Save Streak') && b.web_app?.url?.includes('/quests'))).toBe(true);
  });
});
