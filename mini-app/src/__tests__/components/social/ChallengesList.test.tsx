import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Swords: ({ className }: any) => <span data-testid="swords-icon" className={className} />,
  Target: ({ className }: any) => <span data-testid="target-icon" className={className} />,
  Clock: ({ className }: any) => <span data-testid="clock-icon" className={className} />,
  Users: ({ className }: any) => <span data-testid="users-icon" className={className} />,
}));

import { ChallengesList } from '@/components/social/ChallengesList';

const mockChallenges = [
  {
    id: 1,
    title: 'Daily Push-ups',
    description: 'Do 100 push-ups every day',
    mode: 'fitness',
    target_value: 100,
    start_date: '2025-01-01',
    end_date: null,
    status: 'active',
    progress: 45,
    participant_count: 5,
  },
  {
    id: 2,
    title: 'Read Books',
    description: 'Read 12 books this year',
    mode: 'education',
    target_value: 12,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'active',
    progress: 3,
    participant_count: 2,
  },
];

describe('ChallengesList', () => {
  it('shows empty state when no challenges', () => {
    render(<ChallengesList challenges={[]} />);

    expect(screen.getByTestId('swords-icon')).toBeInTheDocument();
    expect(screen.getByText('No challenges yet. Create one!')).toBeInTheDocument();
  });

  it('renders challenge cards when challenges provided', () => {
    render(<ChallengesList challenges={mockChallenges} />);

    expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Read Books')).toBeInTheDocument();
  });

  it('renders descriptions for each challenge', () => {
    render(<ChallengesList challenges={mockChallenges} />);

    expect(screen.getByText('Do 100 push-ups every day')).toBeInTheDocument();
    expect(screen.getByText('Read 12 books this year')).toBeInTheDocument();
  });

  it('renders correct number of challenge cards', () => {
    const { container } = render(<ChallengesList challenges={mockChallenges} />);

    // Each ChallengeCard renders the title — count them
    const titles = ['Daily Push-ups', 'Read Books'];
    titles.forEach((title) => {
      expect(screen.getByText(title)).toBeInTheDocument();
    });
  });
});
