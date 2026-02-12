import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UserAchievement } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} aria-label={props['aria-label']}>{children}</div>
    ),
  },
}));

import { DashboardAchievementCard } from '@/components/dashboard/DashboardAchievementCard';

const mockUserAchievement: UserAchievement = {
  user_id: 1,
  achievement_id: 10,
  unlocked_at: '2026-01-15T12:00:00Z',
  achievement: {
    id: 10,
    name: 'First Quest',
    description: 'Complete your first quest',
    icon: '🏆',
    xp_reward: 50,
    rarity: 'common',
    category: 'quests',
  },
};

describe('DashboardAchievementCard', () => {
  it('renders achievement icon and name', () => {
    render(<DashboardAchievementCard userAch={mockUserAchievement} />);

    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('First Quest')).toBeInTheDocument();
  });

  it('renders with correct aria-label for accessibility', () => {
    render(<DashboardAchievementCard userAch={mockUserAchievement} />);

    expect(screen.getByLabelText('Achievement: First Quest')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'First Quest' })).toBeInTheDocument();
  });

  it('renders different achievement data correctly', () => {
    const lockedStyleAch: UserAchievement = {
      user_id: 1,
      achievement_id: 20,
      unlocked_at: '2026-02-01T00:00:00Z',
      achievement: {
        id: 20,
        name: 'Marathon Runner',
        description: 'Complete 100 quests',
        icon: '🔒',
        xp_reward: 500,
        rarity: 'legendary',
        category: 'quests',
      },
    };

    render(<DashboardAchievementCard userAch={lockedStyleAch} />);

    expect(screen.getByText('🔒')).toBeInTheDocument();
    expect(screen.getByText('Marathon Runner')).toBeInTheDocument();
    expect(screen.getByLabelText('Achievement: Marathon Runner')).toBeInTheDocument();
  });
});
