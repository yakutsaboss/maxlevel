import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UserStats } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...(props.role ? { role: props.role } : {})} {...(props['aria-label'] ? { 'aria-label': props['aria-label'] } : {})}>{children}</div>
    ),
    span: ({ children, className, ...props }: any) => <span className={className}>{children}</span>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Flame: ({ className }: any) => <span data-testid="flame-icon" className={className} />,
  Award: ({ className }: any) => <span data-testid="award-icon" className={className} />,
  Calendar: ({ className }: any) => <span data-testid="calendar-icon" className={className} />,
}));

import { StreakSection } from '@/components/dashboard/StreakSection';

const baseStreakData: UserStats['streakData'] = {
  current: 5,
  longest: 10,
  daysActive: 20,
};

const emptyPerModeStreaks: UserStats['perModeStreaks'] = [];

describe('StreakSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current streak count', () => {
    render(<StreakSection streakData={baseStreakData} perModeStreaks={emptyPerModeStreaks} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
  });

  it('renders best streak value', () => {
    render(<StreakSection streakData={baseStreakData} perModeStreaks={emptyPerModeStreaks} />);

    expect(screen.getByText('Best: 10')).toBeInTheDocument();
  });

  it('shows fire emoji for per-mode streak with active streak', () => {
    const perModeStreaks: UserStats['perModeStreaks'] = [
      { mode_id: 1, mode_name: 'Fitness', mode_icon: '💪', current_streak: 3, longest_streak: 7 },
    ];

    render(<StreakSection streakData={baseStreakData} perModeStreaks={perModeStreaks} />);

    // Per-mode streak with current_streak > 0 should show fire emoji
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('shows zero streak state without milestone banner', () => {
    const zeroStreak: UserStats['streakData'] = {
      current: 0,
      longest: 5,
      daysActive: 10,
    };

    render(<StreakSection streakData={zeroStreak} perModeStreaks={emptyPerModeStreaks} />);

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('days in a row')).toBeInTheDocument();
    // No milestone banner should be present for 0 streak
    expect(screen.queryByText('Keep the fire burning!')).not.toBeInTheDocument();
  });

  it('shows milestone banner when streak reaches 7 days', () => {
    const weekStreak: UserStats['streakData'] = {
      current: 7,
      longest: 7,
      daysActive: 7,
    };

    render(<StreakSection streakData={weekStreak} perModeStreaks={emptyPerModeStreaks} />);

    expect(screen.getByText('1 Week Streak!')).toBeInTheDocument();
    expect(screen.getByText('Keep the fire burning!')).toBeInTheDocument();
  });
});
