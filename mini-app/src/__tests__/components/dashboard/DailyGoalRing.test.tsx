import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    circle: (props: any) => <circle {...props} />,
  },
}));

import { DailyGoalRing } from '@/components/dashboard/DailyGoalRing';

describe('DailyGoalRing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress ring with correct fraction text', () => {
    render(<DailyGoalRing completedToday={3} totalDaily={5} />);

    expect(screen.getByText('3/5')).toBeInTheDocument();
    expect(screen.getByText('Daily Quests')).toBeInTheDocument();
  });

  it('shows completed state at 100%', () => {
    render(<DailyGoalRing completedToday={5} totalDaily={5} />);

    expect(screen.getByText('5/5')).toBeInTheDocument();
    expect(screen.getByText('All done! Great work!')).toBeInTheDocument();
  });

  it('shows goal text label', () => {
    render(<DailyGoalRing completedToday={1} totalDaily={4} />);

    expect(screen.getByText('Daily Quests')).toBeInTheDocument();
    // Should not show completion message when not done
    expect(screen.queryByText('All done! Great work!')).not.toBeInTheDocument();
  });

  it('handles zero progress with zero total', () => {
    render(<DailyGoalRing completedToday={0} totalDaily={0} />);

    expect(screen.getByText('0/0')).toBeInTheDocument();
    expect(screen.getByText('Daily Quests')).toBeInTheDocument();
    // Should not show completion for 0/0
    expect(screen.queryByText('All done! Great work!')).not.toBeInTheDocument();
  });
});
