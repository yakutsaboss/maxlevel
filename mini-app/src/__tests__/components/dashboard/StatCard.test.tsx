import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} aria-label={props['aria-label']}>{children}</div>
    ),
  },
}));

import { StatCard } from '@/components/dashboard/StatCard';

describe('StatCard', () => {
  it('renders label and value', () => {
    render(
      <StatCard
        icon={<span data-testid="test-icon">⚡</span>}
        label="Total XP"
        value={1250}
        color="bg-purple-500"
      />
    );

    expect(screen.getByText('Total XP')).toBeInTheDocument();
    expect(screen.getByText('1250')).toBeInTheDocument();
    expect(screen.getByLabelText('Total XP: 1250')).toBeInTheDocument();
  });

  it('renders icon inside color container', () => {
    render(
      <StatCard
        icon={<span data-testid="test-icon">⚡</span>}
        label="Level"
        value={5}
        color="bg-blue-500"
      />
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('handles zero and string values', () => {
    const { rerender } = render(
      <StatCard
        icon={<span>📊</span>}
        label="Quests"
        value={0}
        color="bg-green-500"
      />
    );

    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByLabelText('Quests: 0')).toBeInTheDocument();

    rerender(
      <StatCard
        icon={<span>📊</span>}
        label="Rank"
        value="N/A"
        color="bg-gray-500"
      />
    );

    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByLabelText('Rank: N/A')).toBeInTheDocument();
  });
});
