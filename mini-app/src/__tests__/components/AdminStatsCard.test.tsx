import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  Users: (props: any) => <span data-testid="users-icon" {...props} />,
  UserCheck: (props: any) => <span data-testid="usercheck-icon" {...props} />,
  ScrollText: (props: any) => <span data-testid="scrolltext-icon" {...props} />,
  Trophy: (props: any) => <span data-testid="trophy-icon" {...props} />,
  RefreshCw: (props: any) => <span data-testid="refresh-icon" {...props} />,
}));

import { AdminStatsCard } from '@/components/AdminStatsCard';

const mockStats = {
  total_users: 150,
  active_users_7d: 42,
  total_quests_completed: 500,
  total_achievements_unlocked: 89,
};

const defaultProps = {
  credentials: 'dGVzdA==',
  onRefresh: vi.fn(),
};

describe('AdminStatsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders stat labels and values', () => {
    render(<AdminStatsCard stats={mockStats} {...defaultProps} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('150')).toBeInTheDocument();
    expect(screen.getByText('Active (7d)')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Quests Done')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('89')).toBeInTheDocument();
  });

  it('renders skeleton loading state when stats is null', () => {
    const { container } = render(<AdminStatsCard stats={null} {...defaultProps} />);
    const skeletons = container.querySelectorAll('.skeleton');
    expect(skeletons.length).toBe(4);
    expect(screen.queryByText('Total Users')).not.toBeInTheDocument();
  });

  it('handles zero values correctly', () => {
    const zeroStats = {
      total_users: 0,
      active_users_7d: 0,
      total_quests_completed: 0,
      total_achievements_unlocked: 0,
    };
    render(<AdminStatsCard stats={zeroStats} {...defaultProps} />);
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(4);
  });
});
