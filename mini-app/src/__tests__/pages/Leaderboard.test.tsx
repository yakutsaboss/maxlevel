import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Leaderboard } from '@/pages/Leaderboard';

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
    getLeaderboard: vi.fn(),
    getWeeklyLeaderboard: vi.fn(),
    getMonthlyLeaderboard: vi.fn(),
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

const mockGetLeaderboard = vi.mocked(apiClient.getLeaderboard);
const mockGetWeeklyLeaderboard = vi.mocked(apiClient.getWeeklyLeaderboard);

const mockEntries = [
  {
    user_id: 1, telegram_id: 100, username: 'alice', first_name: 'Alice',
    level: 10, total_xp: 5000, current_streak: 5, total_quests_completed: 50,
    xp_rank: 1, level_rank: 1,
  },
  {
    user_id: 2, telegram_id: 200, username: 'bob', first_name: 'Bob',
    level: 8, total_xp: 3000, current_streak: 3, total_quests_completed: 30,
    xp_rank: 2, level_rank: 2,
  },
  {
    user_id: 3, telegram_id: 300, username: 'charlie', first_name: 'Charlie',
    level: 6, total_xp: 2000, current_streak: 2, total_quests_completed: 20,
    xp_rank: 3, level_rank: 3,
  },
  {
    user_id: 4, telegram_id: 123, username: 'testuser', first_name: 'TestMe',
    level: 4, total_xp: 1000, current_streak: 1, total_quests_completed: 10,
    xp_rank: 4, level_rank: 4,
  },
];

describe('Leaderboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading skeleton initially', () => {
    mockGetLeaderboard.mockReturnValue(new Promise(() => {})); // never resolves
    render(<Leaderboard />);
    // Main heading is only in the loaded state
    expect(screen.queryByText('Leaderboard')).not.toBeInTheDocument();
  });

  it('renders top-3 cards and leaderboard rows after data loads', async () => {
    mockGetLeaderboard.mockResolvedValue({ success: true, data: mockEntries } as any);
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Top 3 should be rendered
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    // 4th entry appears in both the leaderboard row and YourRankCard
    expect(screen.getAllByText('TestMe').length).toBeGreaterThanOrEqual(1);
  });

  it('renders time period tabs for switching', async () => {
    mockGetLeaderboard.mockResolvedValue({ success: true, data: mockEntries } as any);
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    // Tab buttons should be present
    expect(screen.getByRole('tab', { name: 'Weekly leaderboard' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Monthly leaderboard' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All Time leaderboard' })).toBeInTheDocument();
  });

  it('switches to weekly leaderboard on tab click', async () => {
    mockGetLeaderboard.mockResolvedValue({ success: true, data: mockEntries } as any);
    mockGetWeeklyLeaderboard.mockResolvedValue({ success: true, data: mockEntries } as any);
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Leaderboard')).toBeInTheDocument();
    });

    const weeklyTab = screen.getByRole('tab', { name: 'Weekly leaderboard' });
    fireEvent.click(weeklyTab);

    await waitFor(() => {
      expect(mockGetWeeklyLeaderboard).toHaveBeenCalledWith(50);
    });
  });

  it('displays Your Rank card when user is in leaderboard', async () => {
    mockGetLeaderboard.mockResolvedValue({ success: true, data: mockEntries } as any);
    render(<Leaderboard />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    // Current user (telegram_id 123) matches entry 4 (TestMe)
    // YourRankCard should render with user's info
    const yourRankCard = screen.getByLabelText(/your rank/i);
    expect(yourRankCard).toBeInTheDocument();
  });
});
