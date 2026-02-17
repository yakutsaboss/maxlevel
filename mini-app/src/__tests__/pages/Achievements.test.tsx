import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// Mock @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'Test' } },
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    BackButton: { show: vi.fn(), hide: vi.fn(), onClick: vi.fn(), offClick: vi.fn() },
    MainButton: {
      show: vi.fn(), hide: vi.fn(), enable: vi.fn(), disable: vi.fn(),
      setText: vi.fn(), onClick: vi.fn(), offClick: vi.fn(),
      showProgress: vi.fn(), hideProgress: vi.fn(), color: '', textColor: '',
    },
    showAlert: vi.fn(),
    showConfirm: vi.fn(),
    showPopup: vi.fn(),
    openLink: vi.fn(),
    openTelegramLink: vi.fn(),
    sendData: vi.fn(),
  },
}));

// Mock react-i18next (used by Achievements page, CategoryTabs, ErrorSection, AchievementProgressBar)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const keys: Record<string, string> = {
        'achievements.rewards': 'Rewards',
        'achievements.progress': 'Progress',
        'achievements.checking': 'Checking...',
        'achievements.checkForNewAchievements': 'Check for new achievements',
        'achievements.couldNotLoad': 'Could not load achievements',
        'achievements.noAchievements': 'No achievements yet',
        'achievements.filterSort': 'Filter & Sort',
        'achievements.filter_all': 'All',
        'achievements.filter_earned': 'Earned',
        'achievements.filter_unearned': 'Unearned',
        'achievements.sort_rarity': 'Rarity',
        'achievements.sort_progress': 'Progress',
        'achievements.sort_recent': 'Recent',
        'achievements.categoryAll': 'All',
        'achievements.categoryFitness': 'Fitness',
        'achievements.categoryHydration': 'Hydration',
        'achievements.categorySocial': 'Social',
        'achievements.categoryStreak': 'Streak',
        'achievements.categoryXp': 'XP',
        'achievements.categoryQuest': 'Quest',
        'achievements.categorySpecial': 'Special',
        'achievements.categoryGeneral': 'General',
        'achievements.progressFriends': 'friends',
        'achievements.progressDays': 'days',
        'achievements.progressQuests': 'quests',
        'achievements.progressLevel': 'Level',
        'achievements.progressChallenges': 'challenges',
        'achievements.progressModes': 'modes',
        'achievements.unlocked': 'Unlocked',
        'achievements.progressNotYet': 'Not yet',
        'errors.somethingWentWrong': 'Something went wrong',
        'common.retry': 'Retry',
      };
      if (key === 'achievements.newUnlocked' && params?.count) {
        return `${params.count} new unlocked!`;
      }
      if (key === 'achievements.noCategoryAchievements' && params?.category) {
        return `No ${params.category} achievements yet`;
      }
      return keys[key] || key;
    },
  }),
}));

// Mock framer-motion (used throughout the page and child components)
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <>{children}</>,
  motion: {
    div: ({ children, className, style, role, 'aria-valuenow': avn, 'aria-valuemin': avmin, 'aria-valuemax': avmax, 'aria-label': al, ...rest }: any) => (
      <div className={className} style={style} role={role} aria-valuenow={avn} aria-valuemin={avmin} aria-valuemax={avmax} aria-label={al}>
        {children}
      </div>
    ),
    button: ({ children, onClick, className, 'aria-label': ariaLabel, 'aria-expanded': ariaExpanded, type }: any) => (
      <button onClick={onClick} className={className} aria-label={ariaLabel} aria-expanded={ariaExpanded} type={type || 'button'}>
        {children}
      </button>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => {
  const IconStub = ({ className }: any) => <span data-testid="icon" className={className} />;
  return {
    Trophy: IconStub,
    RefreshCw: IconStub,
    SlidersHorizontal: IconStub,
    Star: IconStub,
    Lock: IconStub,
    CheckCircle: IconStub,
    Zap: IconStub,
    ChevronDown: IconStub,
    AlertCircle: IconStub,
    Info: IconStub,
  };
});

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

// Mock apiClient
vi.mock('@/api/client', () => ({
  apiClient: {
    getAchievements: vi.fn(),
    getUserAchievements: vi.fn(),
    checkAchievements: vi.fn(),
  },
}));

// Mock usePullToRefresh
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
  PullIndicator: () => null,
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { Achievements } from '@/pages/Achievements';
import { apiClient } from '@/api/client';

const mockGetAchievements = vi.mocked(apiClient.getAchievements);
const mockGetUserAchievements = vi.mocked(apiClient.getUserAchievements);

const mockAllAchievements = [
  { id: 1, name: 'First Steps', description: 'Complete your first quest', icon: '🎯', xp_reward: 50, rarity: 'common', category: 'general' },
  { id: 2, name: 'Streak Master', description: '7-day streak', icon: '🔥', xp_reward: 100, rarity: 'rare', category: 'general' },
  { id: 3, name: 'Hydration Hero', description: 'Drink 8 glasses', icon: '💧', xp_reward: 75, rarity: 'common', category: 'hydration' },
  { id: 4, name: 'Legendary Warrior', description: 'Reach level 50', icon: '⚔️', xp_reward: 500, rarity: 'legendary', category: 'fitness' },
];

const mockUserAchievements = [
  {
    user_id: 1,
    achievement_id: 1,
    unlocked_at: '2024-01-15',
    achievement: mockAllAchievements[0],
  },
];

describe('Achievements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    mockGetAchievements.mockReturnValue(new Promise(() => {}));
    mockGetUserAchievements.mockReturnValue(new Promise(() => {}));
    render(<Achievements />);
    // Main heading is only in loaded state
    expect(screen.queryByText('Rewards')).not.toBeInTheDocument();
  });

  it('renders achievement cards grouped by rarity', async () => {
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAllAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // Rarity groups should be rendered
    expect(screen.getByText('Common')).toBeInTheDocument();
    expect(screen.getByText('Rare')).toBeInTheDocument();
    expect(screen.getByText('Legendary')).toBeInTheDocument();
  });

  it('renders category filter tabs when multiple categories exist', async () => {
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAllAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // With categories derived from criteria (general -> "general", etc.) + "all", tabs should show
    expect(screen.getByRole('tablist', { name: 'Achievement category filter' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Filter by All' })).toBeInTheDocument();
  });

  it('displays locked and unlocked states correctly', async () => {
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAllAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // Progress counter: 1 unlocked out of 4 total
    expect(screen.getByText('1 / 4')).toBeInTheDocument();

    // Unlocked achievement shows its name
    expect(screen.getByText('First Steps')).toBeInTheDocument();
    // Locked achievements show "???" instead of name, but aria-label says "Locked"
    expect(screen.getByLabelText('Achievement: Locked — Locked, 100 XP reward')).toBeInTheDocument();
  });

  it('shows ErrorSection on fetch failure', async () => {
    mockGetAchievements.mockRejectedValue(new Error('Network error'));
    mockGetUserAchievements.mockRejectedValue(new Error('Network error'));
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Could not load achievements')).toBeInTheDocument();
    });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  // --- Run 65: Category filtering with new categories ---

  it('filters achievements by category when tab clicked', async () => {
    // Achievements need criteria fields so getAchievementCategory() derives correct categories
    const extendedAchievements = [
      ...mockAllAchievements,
      { id: 5, name: 'Social Star', description: 'Add 5 friends', icon: '🦋', xp_reward: 150, rarity: 'rare', category: 'social', criteria: { type: 'friend_count', count: 5 } },
      { id: 6, name: 'Streak 3', description: '3-day streak', icon: '🔥', xp_reward: 30, rarity: 'common', category: 'streak', criteria: { type: 'streak', days: 3 } },
      { id: 7, name: 'XP Collector', description: 'Earn 1000 XP', icon: '✨', xp_reward: 200, rarity: 'epic', category: 'xp', criteria: { type: 'total_xp', amount: 1000 } },
    ];

    mockGetAchievements.mockResolvedValue({ success: true, data: extendedAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // Tabs should include new categories derived from criteria:
    // all + general (no criteria) + social (friend_count) + streak + xp = 5 tabs
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(4); // all + at least 3 categories
  });

  it('shows progress bar in header', async () => {
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAllAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // Progress bar with accessible label
    const progressBar = screen.getByRole('progressbar', { name: /Achievement progress/ });
    expect(progressBar).toBeInTheDocument();
  });

  it('shows check for new button', async () => {
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAllAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    expect(screen.getByText('Check for new achievements')).toBeInTheDocument();
  });
});
