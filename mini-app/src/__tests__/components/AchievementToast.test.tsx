import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Achievement } from '@/types';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...rest }: any) => <div className={className}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock Confetti (added by Run 59 Agent C)
vi.mock('@/components/celebrations/Confetti', () => ({
  Confetti: () => null,
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Zap: ({ className }: any) => <span data-testid="zap-icon" className={className}>⚡</span>,
}));

import { AchievementToast } from '@/components/AchievementToast';

const mockAchievement: Achievement = {
  id: 1,
  name: 'First Steps',
  description: 'Complete your first quest',
  icon: '🏆',
  xp_reward: 50,
  rarity: 'common',
  category: 'general',
};

describe('AchievementToast', () => {
  it('renders achievement name', () => {
    render(<AchievementToast achievement={mockAchievement} onClose={vi.fn()} />);

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
  });

  it('shows XP reward', () => {
    render(<AchievementToast achievement={mockAchievement} onClose={vi.fn()} />);

    expect(screen.getByText('+50 XP')).toBeInTheDocument();
    expect(screen.getByTestId('zap-icon')).toBeInTheDocument();
  });

  it('displays achievement icon', () => {
    render(<AchievementToast achievement={mockAchievement} onClose={vi.fn()} />);

    expect(screen.getByText('🏆')).toBeInTheDocument();
  });
});
