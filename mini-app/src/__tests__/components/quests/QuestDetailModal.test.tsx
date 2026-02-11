import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Quest } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, onClick, className, ...props }: any) => (
      <div onClick={onClick} className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock QuestDifficultyBadge
vi.mock('@/components/QuestDifficultyBadge', () => ({
  QuestDifficultyBadge: ({ difficulty }: { difficulty: string }) => (
    <span data-testid="difficulty-badge">{difficulty}</span>
  ),
}));

// Mock CheckInButton
vi.mock('@/components/CheckInButton', () => ({
  CheckInButton: (props: any) => (
    <button data-testid="checkin-button" disabled={props.disabled}>Check In</button>
  ),
}));

// Mock formatDate
vi.mock('@/utils/formatDate', () => ({
  formatDate: (dateStr: string) => 'Jan 1, 2026',
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Zap: () => <span data-testid="zap-icon" />,
  CheckCircle: () => <span data-testid="check-circle-icon" />,
  Loader2: () => <span data-testid="loader-icon" />,
  Calendar: () => <span data-testid="calendar-icon" />,
}));

import { QuestDetailModal } from '@/components/quests/QuestDetailModal';

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
};

const mockCompletedQuest: Quest = {
  ...mockActiveQuest,
  id: 2,
  progress: 5,
  target: 5,
};

describe('QuestDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCheckinSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest title and description', () => {
    render(
      <QuestDetailModal
        quest={mockActiveQuest}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    expect(screen.getByText('Complete 5 pushups')).toBeInTheDocument();
    expect(screen.getByText('Do 5 pushups today')).toBeInTheDocument();
  });

  it('shows XP reward', () => {
    render(
      <QuestDetailModal
        quest={mockActiveQuest}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    expect(screen.getByText('50 XP')).toBeInTheDocument();
  });

  it('shows progress bar with correct values', () => {
    render(
      <QuestDetailModal
        quest={mockActiveQuest}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });

  it('clicking backdrop calls onClose', () => {
    const { container } = render(
      <QuestDetailModal
        quest={mockActiveQuest}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    // The outermost div is the backdrop with onClick={onClose}
    const backdrop = container.firstElementChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows check-in button for in-progress active quests', () => {
    render(
      <QuestDetailModal
        quest={mockActiveQuest}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    expect(screen.getByTestId('checkin-button')).toBeInTheDocument();
  });

  it('returns null when quest is null', () => {
    const { container } = render(
      <QuestDetailModal
        quest={null}
        completing={false}
        userId={123}
        onClose={mockOnClose}
        onCheckinSuccess={mockOnCheckinSuccess}
      />
    );

    expect(container.innerHTML).toBe('');
  });
});
