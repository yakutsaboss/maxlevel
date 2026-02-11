import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Target: ({ className }: any) => <span data-testid="target-icon" className={className} />,
  Zap: ({ className }: any) => <span data-testid="zap-icon" className={className} />,
  Clock: ({ className }: any) => <span data-testid="clock-icon" className={className} />,
  Calendar: ({ className }: any) => <span data-testid="calendar-icon" className={className} />,
}));

import { TodaysProgress } from '@/components/dashboard/TodaysProgress';

describe('TodaysProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest completion count', () => {
    render(<TodaysProgress completedToday={3} xpGainedToday={150} activeQuestsCount={2} />);

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders XP earned today', () => {
    render(<TodaysProgress completedToday={3} xpGainedToday={150} activeQuestsCount={2} />);

    expect(screen.getByText('+150')).toBeInTheDocument();
    expect(screen.getByText('XP Earned')).toBeInTheDocument();
  });

  it('renders active quests remaining', () => {
    render(<TodaysProgress completedToday={3} xpGainedToday={150} activeQuestsCount={2} />);

    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });

  it('handles empty state with all zeros', () => {
    render(<TodaysProgress completedToday={0} xpGainedToday={0} activeQuestsCount={0} />);

    expect(screen.getByText('+0')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Remaining')).toBeInTheDocument();
  });
});
