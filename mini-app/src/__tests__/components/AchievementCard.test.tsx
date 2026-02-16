import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Achievement, UserAchievement } from '@/types';

// Mock react-i18next (used by AchievementProgressBar)
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

// Mock framer-motion
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

// Mock lucide-react
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

import { AchievementCard } from '@/components/achievements/AchievementCard';

const mockAchievement: Achievement = {
  id: 1,
  name: 'First Steps',
  description: 'Complete your first quest',
  icon: '🎯',
  xp_reward: 50,
  rarity: 'common',
  category: 'general',
};

const mockUserAchievement: UserAchievement = {
  user_id: 1,
  achievement_id: 1,
  unlocked_at: '2026-01-15T10:00:00Z',
  achievement: mockAchievement,
};

const mockRarityStyle = {
  border: 'border-yellow-400',
  bg: 'bg-yellow-50',
  text: 'text-yellow-700',
  label: 'Common',
};

const mockHaptic = { impact: vi.fn() };

describe('AchievementCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders achievement name and description when unlocked', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('First Steps')).toBeInTheDocument();
    expect(screen.getByText('Complete your first quest')).toBeInTheDocument();
  });

  it('locked state shows lock icon and hides name', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={false}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // Locked achievements show '???' instead of the real name
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.queryByText('First Steps')).not.toBeInTheDocument();
    // Shows real icon grayed out (grayscale opacity-40) instead of '?'
    expect(screen.getByText('🎯')).toBeInTheDocument();
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });

  it('unlocked state shows XP earned', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // Source renders "+50 XP" inside a green pill (no "Earned:" prefix)
    expect(screen.getByText('+50 XP')).toBeInTheDocument();
  });

  it('locked state shows reward XP', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={false}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // Source renders "+50 XP" inside a hint-colored pill (no "Reward:" prefix)
    // There are multiple "+50 XP" elements (one in the pill, one in expanded details)
    // but at minimum the pill one should exist
    const xpTexts = screen.getAllByText('+50 XP');
    expect(xpTexts.length).toBeGreaterThanOrEqual(1);
  });

  it('triggers haptic feedback on click', () => {
    render(
      <AchievementCard
        achievement={mockAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  // --- Run 65: New tests for enhanced AchievementCard ---

  it('shows criteria hint for new criteria types when locked', () => {
    const socialAch: Achievement = {
      ...mockAchievement,
      id: 10,
      name: 'Social Butterfly',
      criteria: { type: 'friend_count', count: 5 },
    };

    render(
      <AchievementCard
        achievement={socialAch}
        isUnlocked={false}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // getCriteriaHint for friend_count returns "Make 5 friends"
    expect(screen.getByText(/Make 5 friend/)).toBeInTheDocument();
  });

  it('shows unlock date for earned achievements', () => {
    const { container } = render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={mockUserAchievement}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    // formatDate renders a locale-dependent short date (e.g. "Jan 15" or "15 янв.")
    // Find the date element by its distinctive styling
    const dateEl = container.querySelector('p.text-\\[10px\\].text-telegram-hint');
    expect(dateEl).toBeTruthy();
    expect(dateEl?.textContent).toBeTruthy();
    expect(dateEl?.textContent!.length).toBeGreaterThan(0);
  });

  it('shows NEW badge for recently unlocked achievements', () => {
    const recentUnlock: UserAchievement = {
      ...mockUserAchievement,
      unlocked_at: new Date().toISOString(),
    };

    render(
      <AchievementCard
        achievement={mockAchievement}
        userAchievement={recentUnlock}
        isUnlocked={true}
        rarityStyle={mockRarityStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    expect(screen.getByText('NEW')).toBeInTheDocument();
  });

  it('applies rarity-specific border styling', () => {
    const epicStyle = {
      border: 'border-purple-300',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      label: 'Epic',
    };

    const { container } = render(
      <AchievementCard
        achievement={{ ...mockAchievement, rarity: 'epic' }}
        isUnlocked={true}
        rarityStyle={epicStyle}
        index={0}
        haptic={mockHaptic}
      />
    );

    const button = container.querySelector('button');
    expect(button?.className).toContain('border-purple-300');
  });
});
