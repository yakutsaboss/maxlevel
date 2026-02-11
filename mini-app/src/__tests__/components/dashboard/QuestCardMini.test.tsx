import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Quest } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, className, type, ...props }: any) => (
      <button type={type} onClick={onClick} className={className} aria-label={props['aria-label']}>{children}</button>
    ),
    div: ({ children, className, ...props }: any) => <div className={className}>{children}</div>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Zap: ({ className }: any) => <span data-testid="zap-icon" className={className} />,
}));

// Mock QuestDifficultyBadge
vi.mock('@/components/QuestDifficultyBadge', () => ({
  QuestDifficultyBadge: ({ difficulty }: { difficulty: string }) => (
    <span data-testid="difficulty-badge">{difficulty}</span>
  ),
}));

import { QuestCardMini } from '@/components/dashboard/QuestCardMini';

const mockQuest: Quest = {
  id: 1,
  user_id: 1,
  mode_id: 1,
  title: 'Do 10 pushups',
  description: 'Complete 10 pushups in one set',
  xp_reward: 75,
  frequency: 'daily',
  difficulty: 'medium',
  status: 'active',
  progress: 4,
  target: 10,
};

describe('QuestCardMini', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders quest title and description', () => {
    render(<QuestCardMini quest={mockQuest} onClick={vi.fn()} />);

    expect(screen.getByText('Do 10 pushups')).toBeInTheDocument();
    expect(screen.getByText('Complete 10 pushups in one set')).toBeInTheDocument();
  });

  it('shows XP reward value', () => {
    render(<QuestCardMini quest={mockQuest} onClick={vi.fn()} />);

    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
  });

  it('shows progress indicator with correct values', () => {
    render(<QuestCardMini quest={mockQuest} onClick={vi.fn()} />);

    expect(screen.getByText('4 / 10')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });
});
