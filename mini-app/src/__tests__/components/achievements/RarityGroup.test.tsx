import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Achievement, UserAchievement } from '@/types';

// Mock react-i18next (used by AchievementProgressBar inside AchievementCard)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const keys: Record<string, string> = {
        'achievements.progressFriends': 'friends',
        'achievements.progressDays': 'days',
        'achievements.progressQuests': 'quests',
        'achievements.progressLevel': 'Level',
        'achievements.progressChallenges': 'challenges',
        'achievements.progressModes': 'modes',
        'achievements.unlocked': 'Unlocked',
        'achievements.progressNotYet': 'Not yet',
      };
      return keys[key] || key;
    },
  }),
}));

// Mock framer-motion (used by AchievementCard and AchievementProgressBar)
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    button: ({ children, onClick, className, 'aria-label': ariaLabel, 'aria-expanded': ariaExpanded, ...props }: any) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} aria-expanded={ariaExpanded} type="button">{children}</button>
    ),
    div: ({ children, className, style, ...rest }: any) => (
      <div className={className} style={style}>{children}</div>
    ),
  },
}));

// Mock lucide-react (used by AchievementCard)
vi.mock('lucide-react', () => {
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Star: IconStub,
    Lock: IconStub,
    CheckCircle: IconStub,
    Zap: IconStub,
    ChevronDown: IconStub,
  };
});

import { RarityGroup, RARITY_COLORS } from '@/components/achievements/RarityGroup';

const mockAchievements: Achievement[] = [
  { id: 1, name: 'First Steps', description: 'Complete first quest', icon: '🎯', xp_reward: 50, rarity: 'rare', category: 'general' },
  { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 100, rarity: 'rare', category: 'streak' },
  { id: 3, name: 'Explorer', description: 'Try all modes', icon: '🧭', xp_reward: 75, rarity: 'rare', category: 'general' },
];

const mockUserAchievements: UserAchievement[] = [
  { user_id: 1, achievement_id: 1, unlocked_at: '2026-01-15T10:00:00Z', achievement: mockAchievements[0] },
];

const mockHaptic = { impact: vi.fn() };

describe('RarityGroup', () => {
  it('renders group title with rarity label', () => {
    render(
      <RarityGroup
        rarity="rare"
        achievements={mockAchievements}
        unlockedIds={new Set([1])}
        userAchievements={mockUserAchievements}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('Rare')).toBeInTheDocument();
  });

  it('renders achievement cards for each achievement', () => {
    render(
      <RarityGroup
        rarity="rare"
        achievements={mockAchievements}
        unlockedIds={new Set([1])}
        userAchievements={mockUserAchievements}
        haptic={mockHaptic}
      />
    );

    // 3 achievement cards rendered as buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);

    // Unlocked achievement shows name, locked ones show '???'
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    const lockedLabels = screen.getAllByText('???');
    expect(lockedLabels).toHaveLength(2);
  });

  it('shows unlocked count in the counter badge', () => {
    render(
      <RarityGroup
        rarity="rare"
        achievements={mockAchievements}
        unlockedIds={new Set([1, 2])}
        userAchievements={mockUserAchievements}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('2 / 3 unlocked')).toBeInTheDocument();

    // Region aria-label includes unlocked count
    const region = screen.getByRole('region');
    expect(region).toHaveAttribute('aria-label', 'Rare achievements — 2 of 3 unlocked');
  });
});
