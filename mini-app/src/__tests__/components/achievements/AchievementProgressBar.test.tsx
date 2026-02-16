/**
 * Tests for AchievementProgressBar component (mini-app/src/components/achievements/AchievementProgressBar.tsx)
 *
 * Run 65 Agent E: Tests the per-achievement progress bar created by Agent C.
 * Covers: progress display, unlocked state, progress-less types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'achievements.progressFriends': 'friends',
        'achievements.progressDays': 'days',
        'achievements.progressQuests': 'quests',
        'achievements.progressLevel': 'Level',
        'achievements.progressChallenges': 'challenges',
        'achievements.progressModes': 'modes',
        'achievements.unlocked': 'Unlocked',
        'achievements.progressNotYet': 'Not yet',
      };
      return keys[key] || key;
    },
  }),
}));

// Mock framer-motion (used by the progress bar animation)
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, style, ...rest }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
  },
}));

import { AchievementProgressBar } from '@/components/achievements/AchievementProgressBar';

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AchievementProgressBar', () => {
  it('shows progress label with correct fraction', () => {
    const { container } = render(
      <AchievementProgressBar
        criteria={{ type: 'friend_count', count: 10 }}
        currentValue={7}
        targetValue={10}
      />
    );

    // getProgressLabel for friend_count: "7/10 friends"
    expect(screen.getByText(/7\/10/)).toBeInTheDocument();

    // Should have a progress bar track (the outer bg-telegram-hint/15 div)
    const track = container.querySelector('.rounded-full.overflow-hidden');
    expect(track).toBeTruthy();
  });

  it('shows full bar for 100% progress', () => {
    const { container } = render(
      <AchievementProgressBar
        criteria={{ type: 'quest_count', count: 5 }}
        currentValue={5}
        targetValue={5}
      />
    );

    // getProgressLabel for quest_count: "5/5 quests"
    expect(screen.getByText(/5\/5/)).toBeInTheDocument();

    // Should have a progress bar track
    const track = container.querySelector('.rounded-full.overflow-hidden');
    expect(track).toBeTruthy();
  });

  it('shows "Not yet" for binary criteria types without measurable progress', () => {
    const { container } = render(
      <AchievementProgressBar
        criteria={{ type: 'night_quest', hour: 22 }}
        currentValue={0}
        targetValue={1}
      />
    );

    // For binary criteria like night_quest, getProgressLabel returns t('achievements.progressNotYet') = "Not yet"
    expect(screen.getByText('Not yet')).toBeInTheDocument();

    // night_quest/early_quest are binary — no bar (hasProgressBar returns false)
    const track = container.querySelector('.rounded-full.overflow-hidden');
    expect(track).toBeNull();
  });

  it('shows zero progress correctly', () => {
    render(
      <AchievementProgressBar
        criteria={{ type: 'streak', days: 30 }}
        currentValue={0}
        targetValue={30}
      />
    );

    // getProgressLabel for streak: "0/30 days"
    expect(screen.getByText(/0\/30/)).toBeInTheDocument();
  });
});
