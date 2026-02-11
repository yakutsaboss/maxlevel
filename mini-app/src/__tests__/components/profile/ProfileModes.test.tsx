import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, onClick, ...props }: any) => (
      <button className={className} onClick={onClick}>{children}</button>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  TrendingUp: ({ className }: any) => <span data-testid="trending-icon" className={className} />,
}));

// Mock formatDate
vi.mock('@/utils/formatDate', () => ({
  formatDate: () => 'Jun 15, 2025',
}));

import { ProfileModes } from '@/components/profile/ProfileModes';
import type { UserStats } from '@/types';

const mockModes: UserStats['modes'] = [
  {
    user_id: 1,
    mode_id: 1,
    is_active: true,
    activated_at: '2025-06-15T00:00:00Z',
    mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
  },
  {
    user_id: 1,
    mode_id: 2,
    is_active: true,
    activated_at: '2025-07-01T00:00:00Z',
    mode: { id: 2, name: 'learning', display_name: 'Learning', description: '', icon: '📚', is_active: true },
  },
];

const mockStreaks: UserStats['perModeStreaks'] = [
  { mode_id: 1, mode_name: 'fitness', mode_icon: '💪', current_streak: 5, longest_streak: 10 },
];

const mockHaptic = { impact: vi.fn() };

describe('ProfileModes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active modes grid with icons and names', () => {
    render(<ProfileModes modes={mockModes} perModeStreaks={mockStreaks} haptic={mockHaptic} />);

    expect(screen.getByText('My Modes')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
    expect(screen.getByText('💪')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
  });

  it('shows mode streak badges', () => {
    render(<ProfileModes modes={mockModes} perModeStreaks={mockStreaks} haptic={mockHaptic} />);

    // Fitness mode has streak of 5
    expect(screen.getByText('🔥5')).toBeInTheDocument();
  });

  it('handles empty modes state', () => {
    render(<ProfileModes modes={[]} perModeStreaks={[]} haptic={mockHaptic} />);

    expect(screen.getByText('My Modes')).toBeInTheDocument();
    // No mode buttons should be rendered
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
