import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/AdminStatsCard', () => ({
  AdminStatsCard: ({ stats, credentials }: { stats: unknown; credentials: string }) => (
    <div data-testid="admin-stats-card">
      {stats ? `Stats loaded (creds: ${credentials})` : 'No stats'}
    </div>
  ),
}));

import { AdminOverview } from '@/components/admin/AdminOverview';

const mockStats = {
  total_users: 150,
  active_users_7d: 42,
  total_quests_completed: 500,
  total_achievements_unlocked: 89,
};

describe('AdminOverview', () => {
  const defaultProps = {
    credentials: 'dGVzdA==',
    onRefresh: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders AdminStatsCard with stats', () => {
    render(<AdminOverview stats={mockStats} {...defaultProps} />);

    const card = screen.getByTestId('admin-stats-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('Stats loaded');
    expect(card).toHaveTextContent('creds: dGVzdA==');
  });

  it('renders empty state when stats is null', () => {
    render(<AdminOverview stats={null} {...defaultProps} />);

    const card = screen.getByTestId('admin-stats-card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveTextContent('No stats');
  });
});
