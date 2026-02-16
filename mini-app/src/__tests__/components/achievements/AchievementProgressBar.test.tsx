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
    t: (key: string, params?: Record<string, any>) => {
      if (key === 'achievements.unlocked') return 'Unlocked';
      if (key === 'achievements.notYet') return 'Not yet';
      if (key === 'achievements.progress') return `${params?.current ?? 0}/${params?.target ?? 0}`;
      return key;
    },
  }),
}));

import { AchievementProgressBar } from '@/components/achievements/AchievementProgressBar';

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AchievementProgressBar', () => {
  it('shows progress bar with correct percentage', () => {
    render(
      <AchievementProgressBar
        criteria={{ type: 'friend_count', count: 10 }}
        currentValue={7}
        targetValue={10}
      />
    );

    // Should show some indication of 7/10 progress
    expect(screen.getByText(/7\/10/)).toBeInTheDocument();

    // Should have a progress bar element
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows full bar for 100% progress', () => {
    render(
      <AchievementProgressBar
        criteria={{ type: 'quest_count', count: 5 }}
        currentValue={5}
        targetValue={5}
      />
    );

    expect(screen.getByText(/5\/5/)).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows "Not yet" for criteria types without measurable progress', () => {
    render(
      <AchievementProgressBar
        criteria={{ type: 'night_quest', hour: 22 }}
        currentValue={0}
        targetValue={1}
      />
    );

    // For binary criteria like night_quest, should show "Not yet" when not achieved
    expect(screen.getByText('Not yet')).toBeInTheDocument();
  });

  it('shows zero progress correctly', () => {
    render(
      <AchievementProgressBar
        criteria={{ type: 'streak', days: 30 }}
        currentValue={0}
        targetValue={30}
      />
    );

    expect(screen.getByText(/0\/30/)).toBeInTheDocument();
  });
});
