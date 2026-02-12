import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Target: ({ className }: any) => <span data-testid="target-icon" className={className} />,
  Clock: ({ className }: any) => <span data-testid="clock-icon" className={className} />,
  Users: ({ className }: any) => <span data-testid="users-icon" className={className} />,
}));

import { ChallengeCard } from '@/components/social/ChallengeCard';

const baseChallenge = {
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
};

describe('ChallengeCard', () => {
  it('renders challenge title and description', () => {
    render(<ChallengeCard challenge={baseChallenge} />);

    expect(screen.getByText('Daily Push-ups')).toBeInTheDocument();
    expect(screen.getByText('Do 100 push-ups every day')).toBeInTheDocument();
  });

  it('shows mode badge when mode is present', () => {
    render(<ChallengeCard challenge={baseChallenge} />);

    expect(screen.getByText('fitness')).toBeInTheDocument();
  });

  it('hides mode badge when mode is null', () => {
    render(<ChallengeCard challenge={{ ...baseChallenge, mode: null }} />);

    expect(screen.queryByText('fitness')).not.toBeInTheDocument();
  });

  it('displays progress bar with correct values', () => {
    render(<ChallengeCard challenge={baseChallenge} />);

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('45/100 (45%)')).toBeInTheDocument();
  });

  it('shows participant count with correct plural', () => {
    render(<ChallengeCard challenge={baseChallenge} />);
    expect(screen.getByText('5 participants')).toBeInTheDocument();

    const { unmount } = render(
      <ChallengeCard challenge={{ ...baseChallenge, participant_count: 1 }} />
    );
    expect(screen.getByText('1 participant')).toBeInTheDocument();
    unmount();
  });

  it('shows "No deadline" when end_date is null', () => {
    render(<ChallengeCard challenge={baseChallenge} />);

    expect(screen.getByText('No deadline')).toBeInTheDocument();
  });

  it('shows "Ended" for past end dates', () => {
    render(
      <ChallengeCard challenge={{ ...baseChallenge, end_date: '2020-01-01' }} />
    );

    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('shows Completed badge when progress reaches target', () => {
    render(
      <ChallengeCard challenge={{ ...baseChallenge, progress: 100 }} />
    );

    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('100/100 (100%)')).toBeInTheDocument();
  });

  it('caps progress at 100% even when exceeding target', () => {
    render(
      <ChallengeCard challenge={{ ...baseChallenge, progress: 150 }} />
    );

    expect(screen.getByText('150/100 (100%)')).toBeInTheDocument();
  });

  it('hides description when null', () => {
    render(
      <ChallengeCard challenge={{ ...baseChallenge, description: null }} />
    );

    expect(screen.queryByText('Do 100 push-ups every day')).not.toBeInTheDocument();
  });
});
