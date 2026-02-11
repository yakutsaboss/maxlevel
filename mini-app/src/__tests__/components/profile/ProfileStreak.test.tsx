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
  Calendar: ({ className }: any) => <span data-testid="calendar-icon" className={className} />,
}));

import { ProfileStreak } from '@/components/profile/ProfileStreak';

describe('ProfileStreak', () => {
  it('renders streak count and best streak', () => {
    render(<ProfileStreak currentStreak={7} longestStreak={14} />);

    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('7 days')).toBeInTheDocument();
    expect(screen.getByText('Best: 14 days')).toBeInTheDocument();
  });

  it('shows fire emoji and region label', () => {
    render(<ProfileStreak currentStreak={7} longestStreak={14} />);

    expect(screen.getByText('🔥')).toBeInTheDocument();
    const region = screen.getByRole('region', { name: /streak: 7 days current, 14 days best/i });
    expect(region).toBeInTheDocument();
  });

  it('handles zero streak', () => {
    render(<ProfileStreak currentStreak={0} longestStreak={0} />);

    expect(screen.getByText('0 days')).toBeInTheDocument();
    expect(screen.getByText('Best: 0 days')).toBeInTheDocument();
  });
});
