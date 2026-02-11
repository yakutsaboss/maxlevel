import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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
  Trophy: () => <span data-testid="trophy-icon" />,
  Award: () => <span data-testid="award-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Pencil: ({ className }: any) => <span data-testid="pencil-icon" className={className} />,
  Settings: ({ className }: any) => <span data-testid="settings-icon" className={className} />,
}));

// Mock ProfileEditModal AVATAR_OPTIONS
vi.mock('@/components/ProfileEditModal', () => ({
  AVATAR_OPTIONS: [
    { icon: '⚔️', color: 'bg-red-500', label: 'Warrior' },
    { icon: '🧙', color: 'bg-purple-500', label: 'Mage' },
  ],
}));

import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { UserStats } from '@/types';

const mockStats: UserStats = {
  user: {
    id: 1,
    telegram_id: 123,
    first_name: 'Test',
    last_name: 'User',
    username: 'testuser',
    level: 5,
    xp: 350,
    xp_to_next_level: 500,
    total_quests_completed: 42,
    current_streak: 7,
    longest_streak: 14,
    avatar_id: 1,
    created_at: '2025-06-15T00:00:00Z',
  },
  modes: [],
  activeQuests: [],
  completedQuestsToday: 0,
  recentAchievements: [],
  xpGainedToday: 0,
  streakData: { current: 7, longest: 14, daysActive: 30 },
};

const mockHaptic = { impact: vi.fn() };

describe('ProfileHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user name and avatar', () => {
    render(
      <ProfileHeader stats={mockStats} achievementCount={10} onEdit={vi.fn()} onSettingsClick={vi.fn()} haptic={mockHaptic} />
    );

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('⚔️')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('shows level and XP bar', () => {
    render(
      <ProfileHeader stats={mockStats} achievementCount={10} onEdit={vi.fn()} onSettingsClick={vi.fn()} haptic={mockHaptic} />
    );

    expect(screen.getByText('Lv 5')).toBeInTheDocument();
    const xpBar = screen.getByRole('progressbar', { name: /xp progress/i });
    expect(xpBar).toBeInTheDocument();
    expect(xpBar).toHaveAttribute('aria-valuenow', '350');
    expect(xpBar).toHaveAttribute('aria-valuemax', '500');
  });

  it('shows XP progress text', () => {
    render(
      <ProfileHeader stats={mockStats} achievementCount={10} onEdit={vi.fn()} onSettingsClick={vi.fn()} haptic={mockHaptic} />
    );

    expect(screen.getByText('350 / 500 XP')).toBeInTheDocument();
  });

  it('renders stat badges with correct values', () => {
    render(
      <ProfileHeader stats={mockStats} achievementCount={10} onEdit={vi.fn()} onSettingsClick={vi.fn()} haptic={mockHaptic} />
    );

    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('Quests')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('Total XP')).toBeInTheDocument();
  });

  it('handles missing avatar_id (defaults to first avatar)', () => {
    const statsNoAvatar = {
      ...mockStats,
      user: { ...mockStats.user, avatar_id: undefined },
    };
    render(
      <ProfileHeader stats={statsNoAvatar} achievementCount={0} onEdit={vi.fn()} onSettingsClick={vi.fn()} haptic={mockHaptic} />
    );

    // avatar_id undefined → Math.max(0, (undefined ?? 1) - 1) = 0 → first avatar
    expect(screen.getByText('⚔️')).toBeInTheDocument();
  });
});
