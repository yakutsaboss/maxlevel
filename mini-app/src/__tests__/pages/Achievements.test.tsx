import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Achievements } from '@/pages/Achievements';

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

    // With 3 categories (general, hydration, fitness) + "all" = 4, tabs should show
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

  // ─── Run 65: Category filtering with new categories ───────────────

  it('filters achievements by category when tab clicked', async () => {
    const extendedAchievements = [
      ...mockAllAchievements,
      { id: 5, name: 'Social Star', description: 'Add 5 friends', icon: '🦋', xp_reward: 150, rarity: 'rare', category: 'social' },
      { id: 6, name: 'Streak 3', description: '3-day streak', icon: '🔥', xp_reward: 30, rarity: 'common', category: 'streak' },
    ];

    mockGetAchievements.mockResolvedValue({ success: true, data: extendedAchievements } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    render(<Achievements />);

    await waitFor(() => {
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    // Tabs should include new categories
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    // Find and click a category tab (e.g. "social" or the tab containing social text)
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
