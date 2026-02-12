import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UserMode } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} aria-label={props['aria-label']}>{children}</div>
    ),
  },
}));

import { ModeCard } from '@/components/dashboard/ModeCard';

const mockUserMode: UserMode = {
  user_id: 1,
  mode_id: 3,
  is_active: true,
  activated_at: '2026-01-10T08:00:00Z',
  mode: {
    id: 3,
    name: 'fitness',
    display_name: 'Fitness',
    description: 'Physical fitness challenges',
    icon: '💪',
    is_active: true,
  },
};

describe('ModeCard', () => {
  it('renders mode name and icon', () => {
    render(<ModeCard userMode={mockUserMode} />);

    expect(screen.getByText('💪')).toBeInTheDocument();
    expect(screen.getByText('Fitness')).toBeInTheDocument();
  });

  it('renders with correct aria-label for accessibility', () => {
    render(<ModeCard userMode={mockUserMode} />);

    expect(screen.getByLabelText('Mode: Fitness')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Fitness' })).toBeInTheDocument();
  });

  it('renders different mode data correctly', () => {
    const studyMode: UserMode = {
      user_id: 1,
      mode_id: 5,
      is_active: true,
      activated_at: '2026-02-01T00:00:00Z',
      mode: {
        id: 5,
        name: 'study',
        display_name: 'Study',
        description: 'Academic study challenges',
        icon: '📚',
        is_active: true,
      },
    };

    render(<ModeCard userMode={studyMode} />);

    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByLabelText('Mode: Study')).toBeInTheDocument();
  });
});
