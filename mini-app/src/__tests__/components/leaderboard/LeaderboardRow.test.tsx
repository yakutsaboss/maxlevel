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

// Mock TopThreeCard exports used by LeaderboardRow
vi.mock('@/components/leaderboard/TopThreeCard', () => ({
  RankIcon: ({ rank }: { rank: number }) => <span data-testid="rank-icon">{rank}</span>,
  TrendArrow: ({ trend }: { trend: string }) => <span data-testid="trend-arrow">{trend}</span>,
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

import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';

const mockEntry: LeaderboardEntry = {
  user_id: 10,
  telegram_id: 1010,
  username: 'player10',
  first_name: 'Charlie',
  level: 15,
  total_xp: 850,
  current_streak: 5,
  total_quests_completed: 60,
  xp_rank: 4,
  level_rank: 4,
};

describe('LeaderboardRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rank number and user name', () => {
    render(
      <LeaderboardRow entry={mockEntry} rank={4} isCurrentUser={false} timePeriod="all_time" index={0} />
    );

    expect(screen.getByTestId('rank-icon')).toBeInTheDocument();
    expect(screen.getAllByText('Charlie').length).toBeGreaterThanOrEqual(1);
  });

  it('shows level badge and quest count', () => {
    render(
      <LeaderboardRow entry={mockEntry} rank={4} isCurrentUser={false} timePeriod="all_time" index={0} />
    );

    expect(screen.getByText('Lv 15')).toBeInTheDocument();
    expect(screen.getByText('60 quests')).toBeInTheDocument();
  });

  it('shows XP value', () => {
    render(
      <LeaderboardRow entry={mockEntry} rank={4} isCurrentUser={false} timePeriod="all_time" index={0} />
    );

    expect(screen.getByText('850')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
  });
});
