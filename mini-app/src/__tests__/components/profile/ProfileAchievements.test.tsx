import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick}>{children}</button>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Trophy: ({ className }: any) => <span data-testid="trophy-icon" className={className} />,
  ChevronRight: ({ className }: any) => <span data-testid="chevron-right-icon" className={className} />,
}));

import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import type { UserAchievement, Achievement } from '@/types';

const mockAchievements: UserAchievement[] = [
  {
    user_id: 1,
    achievement_id: 1,
    unlocked_at: '2025-12-01T00:00:00Z',
    achievement: {
      id: 1,
      name: 'First Quest',
      description: 'Complete your first quest',
      icon: '🏆',
      xp_reward: 50,
      rarity: 'common',
      category: 'quest',
    },
  },
  {
    user_id: 1,
    achievement_id: 2,
    unlocked_at: '2025-12-15T00:00:00Z',
    achievement: {
      id: 2,
      name: 'Streak Master',
      description: '7 day streak',
      icon: '🔥',
      xp_reward: 100,
      rarity: 'rare',
      category: 'streak',
    },
  },
];

const mockAllAchievements: Achievement[] = [
  mockAchievements[0].achievement,
  mockAchievements[1].achievement,
  {
    id: 3,
    name: 'Legend',
    description: 'Reach level 50',
    icon: '👑',
    xp_reward: 500,
    rarity: 'legendary',
    category: 'level',
  },
];

const mockHaptic = { impact: vi.fn() };

describe('ProfileAchievements', () => {
  const mockOnViewAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders achievement badges and progress', () => {
    render(
      <MemoryRouter>
        <ProfileAchievements
          achievements={mockAchievements}
          allAchievements={mockAllAchievements}
          haptic={mockHaptic}
          onViewAll={mockOnViewAll}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('First Quest')).toBeInTheDocument();
    expect(screen.getByText('Streak Master')).toBeInTheDocument();
    expect(screen.getByText('🏆')).toBeInTheDocument();
    expect(screen.getByText('🔥')).toBeInTheDocument();
  });

  it('shows count of unlocked achievements and percentage', () => {
    render(
      <MemoryRouter>
        <ProfileAchievements
          achievements={mockAchievements}
          allAchievements={mockAllAchievements}
          haptic={mockHaptic}
          onViewAll={mockOnViewAll}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('2/3 unlocked')).toBeInTheDocument();
    expect(screen.getByText('67%')).toBeInTheDocument();
    const progressBar = screen.getByRole('progressbar', { name: /achievement progress/i });
    expect(progressBar).toHaveAttribute('aria-valuenow', '2');
    expect(progressBar).toHaveAttribute('aria-valuemax', '3');
  });

  it('handles no achievements', () => {
    render(
      <MemoryRouter>
        <ProfileAchievements
          achievements={[]}
          allAchievements={mockAllAchievements}
          haptic={mockHaptic}
          onViewAll={mockOnViewAll}
        />
      </MemoryRouter>
    );

    expect(screen.getByText('Complete quests to earn achievements!')).toBeInTheDocument();
    expect(screen.getByText('0/3 unlocked')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
