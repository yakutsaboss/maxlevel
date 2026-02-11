import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LeaderboardEntry } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, role, ...props }: any) => (
      <div className={className} role={role} aria-label={props['aria-label']}>{children}</div>
    ),
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trophy: ({ className }: any) => <span data-testid="trophy-icon" className={className}>🏆</span>,
  Medal: ({ className }: any) => <span data-testid="medal-icon" className={className}>🥈</span>,
  Award: ({ className }: any) => <span data-testid="award-icon" className={className}>🥉</span>,
}));

// Mock UserAvatar
vi.mock('@/components/leaderboard/UserAvatar', () => ({
  UserAvatar: ({ firstName }: any) => <span data-testid="user-avatar">{firstName}</span>,
}));

import { TopThreeCard } from '@/components/leaderboard/TopThreeCard';

const mockEntry: LeaderboardEntry = {
  user_id: 1,
  telegram_id: 111,
  username: 'testuser',
  first_name: 'Alice',
  level: 12,
  total_xp: 500,
  current_streak: 7,
  total_quests_completed: 42,
  xp_rank: 1,
  level_rank: 1,
};

describe('TopThreeCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user name and level', () => {
    render(
      <TopThreeCard entry={mockEntry} rank={1} isCurrentUser={false} timePeriod="all_time" index={0} />
    );

    expect(screen.getAllByText('Alice').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Lv 12')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('shows trophy icon for rank 1', () => {
    render(
      <TopThreeCard entry={mockEntry} rank={1} isCurrentUser={false} timePeriod="all_time" index={0} />
    );

    expect(screen.getByTestId('trophy-icon')).toBeInTheDocument();
  });

  it('shows XP value with correct time period label', () => {
    render(
      <TopThreeCard entry={{ ...mockEntry, weekly_xp: 850 }} rank={1} isCurrentUser={false} timePeriod="weekly" index={0} />
    );

    expect(screen.getByText('850')).toBeInTheDocument();
    expect(screen.getByText('Weekly XP')).toBeInTheDocument();
  });

  it('highlights current user with "You" badge', () => {
    render(
      <TopThreeCard entry={mockEntry} rank={2} isCurrentUser={true} timePeriod="all_time" index={1} />
    );

    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
