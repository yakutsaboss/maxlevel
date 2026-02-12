import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { AdminUserDetail, UserDetail } from '@/components/AdminUserDetail';

const mockUser: UserDetail = {
  id: 1,
  telegram_id: 12345,
  display_name: 'TestUser',
  username: 'testuser',
  xp: 500,
  level: 7,
  streak_days: 14,
  active_modes: ['fitness', 'learning'],
  quests_completed: 25,
  achievements_unlocked: 8,
  created_at: '2025-06-15T10:00:00Z',
  last_active: '2026-02-10T18:30:00Z',
};

describe('AdminUserDetail', () => {
  it('renders user stats grid', () => {
    render(<AdminUserDetail user={mockUser} onBack={() => {}} />);

    expect(screen.getByText('Level')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('XP')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.getByText('Streak')).toBeInTheDocument();
    expect(screen.getByText('14d')).toBeInTheDocument();
    expect(screen.getByText('Quests Done')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders active modes', () => {
    render(<AdminUserDetail user={mockUser} onBack={() => {}} />);

    expect(screen.getByText('fitness')).toBeInTheDocument();
    expect(screen.getByText('learning')).toBeInTheDocument();
  });

  it('renders join date', () => {
    render(<AdminUserDetail user={mockUser} onBack={() => {}} />);

    const joinText = screen.getByText(/Joined:/);
    expect(joinText).toBeInTheDocument();
  });

  it('back button calls onBack', () => {
    const onBack = vi.fn();
    render(<AdminUserDetail user={mockUser} onBack={onBack} />);

    fireEvent.click(screen.getByText('Back to list'));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
