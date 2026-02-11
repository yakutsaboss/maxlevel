import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { LeaderboardEntry } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} aria-label={props['aria-label']}>{children}</div>
    ),
  },
}));

// Mock UserAvatar
vi.mock('@/components/leaderboard/UserAvatar', () => ({
  UserAvatar: ({ firstName }: any) => <span data-testid="user-avatar">{firstName}</span>,
}));

// Mock TopThreeCard exports used by YourRankCard
vi.mock('@/components/leaderboard/TopThreeCard', () => ({
  getXpValue: (entry: any, timePeriod: string) => {
    if (timePeriod === 'weekly' && entry.weekly_xp != null) return entry.weekly_xp;
    if (timePeriod === 'monthly' && entry.monthly_xp != null) return entry.monthly_xp;
    return entry.total_xp;
  },
  getXpLabel: (timePeriod: string) => {
    if (timePeriod === 'weekly') return 'Weekly XP';
    if (timePeriod === 'monthly') return 'Monthly XP';
    return 'XP';
  },
}));

import { YourRankCard } from '@/components/leaderboard/YourRankCard';

const mockEntry: LeaderboardEntry = {
  user_id: 5,
  telegram_id: 555,
  username: 'myuser',
  first_name: 'Bob',
  level: 8,
  total_xp: 320,
  current_streak: 3,
  total_quests_completed: 25,
  xp_rank: 7,
  level_rank: 6,
};

describe('YourRankCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current rank position and name', () => {
    render(<YourRankCard entry={mockEntry} rank={7} timePeriod="all_time" />);

    expect(screen.getByText('#7')).toBeInTheDocument();
    expect(screen.getAllByText('Bob').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows XP and level', () => {
    render(<YourRankCard entry={mockEntry} rank={7} timePeriod="all_time" />);

    expect(screen.getByText('Lv 8')).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
  });

  it('handles unranked state when entry is null', () => {
    render(<YourRankCard entry={null} rank={null} timePeriod="all_time" />);

    // Should show unranked placeholder
    expect(screen.getByText('?')).toBeInTheDocument();
  });
});
