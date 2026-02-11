import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Achievement, UserAchievement } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, 'aria-label': ariaLabel, ...props }: any) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} type="button">{children}</button>
    ),
  },
}));

import { AchievementCard } from '@/components/achievements/AchievementCard';

const mockAchievement: Achievement = {
  id: 1,
  name: 'First Steps',
  description: 'Complete your first quest',
  icon: '🎯',
  xp_reward: 50,
  rarity: 'common',
  category: 'general',
};

const mockUserAchievement: UserAchievement = {
  user_id: 1,
  achievement_id: 1,
  unlocked_at: '2026-01-15T10:00:00Z',
  achievement: mockAchievement,
};

const mockRarityStyle = {
  border: 'border-yellow-400',
  bg: 'bg-yellow-50',
  text: 'text-yellow-700',
  label: 'Common',
};

const mockHaptic = { impact: vi.fn() };

describe('AchievementCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders achievement name and description when unlocked', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first quest')).toBeInTheDocument();
  });

  it('locked state shows lock icon and hides name', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={false}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // Locked achievements show '???' instead of the real name
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.queryByText('First Steps')).not.toBeInTheDocument();
    // Shows real icon grayed out (grayscale opacity-40) instead of '?'
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });

  it('unlocked state shows XP earned', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('Earned: +50 XP')).toBeInTheDocument();
  });

  it('locked state shows reward XP', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={false}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('Reward: +50 XP')).toBeInTheDocument();
  });

  it('triggers haptic feedback on click', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });
});
