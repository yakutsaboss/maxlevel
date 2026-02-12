import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Flame: ({ className }: any) => <span data-testid="flame-icon" className={className} />,
  Award: ({ className }: any) => <span data-testid="award-icon" className={className} />,
}));

import { HabitStreak } from '@/components/habits/HabitStreak';

describe('HabitStreak', () => {
  const defaultProps = {
    streakDays: 5,
    longestStreak: 10,
    weekData: [true, true, true, true, true, false, false],
  };

  it('renders streak count and label', () => {
    render(<HabitStreak {...defaultProps} />);

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('days streak')).toBeInTheDocument();
  });

  it('uses singular "day" for streak of 1', () => {
    render(<HabitStreak {...defaultProps} streakDays={1} />);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('day streak')).toBeInTheDocument();
  });

  it('displays longest streak', () => {
    render(<HabitStreak {...defaultProps} />);

    expect(screen.getByText('Best: 10')).toBeInTheDocument();
  });

  it('renders 7-day calendar with correct labels', () => {
    render(<HabitStreak {...defaultProps} />);

    expect(screen.getByText('Last 7 days')).toBeInTheDocument();
    // Day labels: M T W T F S S
    const labels = screen.getAllByText(/^[MTWFS]$/);
    expect(labels).toHaveLength(7);
  });

  it('shows checkmarks for completed days and dots for missed', () => {
    // weekData: [true, true, true, true, true, false, false]
    render(<HabitStreak {...defaultProps} />);

    const checks = screen.getAllByText('\u2713');
    const dots = screen.getAllByText('\u00B7');
    expect(checks).toHaveLength(5);
    expect(dots).toHaveLength(2);
  });

  it('has aria-label with streak info on the counter card', () => {
    render(<HabitStreak {...defaultProps} />);

    expect(
      screen.getByLabelText('Current streak: 5 days, Longest: 10 days')
    ).toBeInTheDocument();
  });

  it('renders flame and award icons', () => {
    render(<HabitStreak {...defaultProps} />);

    expect(screen.getByTestId('flame-icon')).toBeInTheDocument();
    expect(screen.getByTestId('award-icon')).toBeInTheDocument();
  });
});
