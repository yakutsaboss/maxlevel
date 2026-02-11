import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Quest } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className} data-testid="quest-card">{children}</div>
    ),
  },
}));

// Mock QuestDifficultyBadge
vi.mock('@/components/QuestDifficultyBadge', () => ({
  QuestDifficultyBadge: ({ difficulty }: { difficulty: string }) => (
    <span data-testid="difficulty-badge">{difficulty}</span>
  ),
}));

// Mock formatDate
vi.mock('@/utils/formatDate', () => ({
  formatDate: (dateStr: string) => 'Jan 1, 2026',
}));

import { QuestCard } from '@/components/quests/QuestCard';

const mockActiveQuest: Quest = {
  id: 1,
  user_id: 1,
  mode_id: 1,
  title: 'Complete 5 pushups',
  description: 'Do 5 pushups today',
  xp_reward: 50,
  frequency: 'daily',
  difficulty: 'easy',
  status: 'active',
  progress: 3,
  target: 5,
  mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
};

const mockCompletedQuest: Quest = {
  ...mockActiveQuest,
  id: 2,
  title: 'Read for 30 minutes',
  status: 'completed',
  progress: 1,
  target: 1,
  xp_reward: 100,
  completed_at: '2026-01-15T10:00:00Z',
};

describe('QuestCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest title and XP reward', () => {
    render(<QuestCard quest={mockActiveQuest} index={0} isSelected={false} onClick={vi.fn()} />);

    expect(screen.getByText('Complete 5 pushups')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
  });

  it('shows progress bar with correct values for active quest', () => {
    render(<QuestCard quest={mockActiveQuest} index={0} isSelected={false} onClick={vi.fn()} />);

    expect(screen.getByText('3 / 5')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('click calls onClick handler', () => {
    const onClick = vi.fn();
    render(<QuestCard quest={mockActiveQuest} index={0} isSelected={false} onClick={onClick} />);

    // Click the outermost quest-card div (the first one has the onClick handler)
    fireEvent.click(screen.getByText('Complete 5 pushups'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('completed quest shows check mark and hides progress bar', () => {
    render(<QuestCard quest={mockCompletedQuest} index={0} isSelected={false} onClick={vi.fn()} />);

    // Progress bar should NOT be present for completed quests
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    // Completed date should show
    expect(screen.getByText(/Completed/)).toBeInTheDocument();
  });

  it('renders difficulty badge when quest has difficulty', () => {
    render(<QuestCard quest={mockActiveQuest} index={0} isSelected={false} onClick={vi.fn()} />);

    expect(screen.getByTestId('difficulty-badge')).toBeInTheDocument();
    expect(screen.getByText('easy')).toBeInTheDocument();
  });
});
