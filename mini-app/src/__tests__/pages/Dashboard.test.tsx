import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '@/pages/Dashboard';

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
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useDashboardData
const mockUseDashboardData = vi.fn();
vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: (...args: unknown[]) => mockUseDashboardData(...args),
}));

// Mock PullIndicator (imported by Dashboard from usePullToRefresh)
vi.mock('@/hooks/usePullToRefresh', () => ({
  PullIndicator: () => <div data-testid="pull-indicator" />,
  usePullToRefresh: vi.fn(),
}));

const mockStats = {
  user: {
    id: 1,
    telegram_id: 123,
    username: 'testuser',
    first_name: 'TestUser',
    level: 5,
    xp: 100,
    xp_to_next_level: 200,
    total_quests_completed: 10,
    current_streak: 3,
    longest_streak: 7,
    created_at: '2024-01-01',
  },
  modes: [],
  activeQuests: [],
  completedQuestsToday: 2,
  recentAchievements: [],
  xpGainedToday: 50,
  streakData: { current: 3, longest: 7, daysActive: 14 },
  perModeStreaks: [],
};

const baseHookReturn = {
  stats: null,
  loading: true,
  error: false,
  toastAchievement: null,
  setToastAchievement: vi.fn(),
  loadUserStats: vi.fn(),
  containerRef: { current: null },
  pullDistance: 0,
  refreshing: false,
  pullThreshold: 60,
  touchHandlers: {
    onTouchStart: vi.fn(),
    onTouchMove: vi.fn(),
    onTouchEnd: vi.fn(),
  },
  handleQuestClick: vi.fn(),
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDashboardData.mockReturnValue({ ...baseHookReturn });
  });

  it('renders loading skeleton initially', () => {
    render(<Dashboard />);
    // When loading, stat cards should not be rendered
    expect(screen.queryByText('Quests Done')).not.toBeInTheDocument();
    expect(screen.queryByText('Total XP')).not.toBeInTheDocument();
  });

  it('renders stat cards after data loads', () => {
    mockUseDashboardData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
    });
    render(<Dashboard />);
    expect(screen.getByText('Quests Done')).toBeInTheDocument();
    expect(screen.getByText('Total XP')).toBeInTheDocument();
    expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    expect(screen.getByText('Achievements')).toBeInTheDocument();
  });

  it('renders streak section with streak data', () => {
    mockUseDashboardData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
    });
    render(<Dashboard />);
    // StatCard for "Longest Streak" shows value
    expect(screen.getByText('7 days')).toBeInTheDocument();
  });

  it('shows ErrorSection on error state', () => {
    mockUseDashboardData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      error: true,
      stats: null,
    });
    render(<Dashboard />);
    expect(screen.getByText('Could not load your dashboard data')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('pull-to-refresh touch handlers are wired to container', () => {
    const mockTouchStart = vi.fn();
    mockUseDashboardData.mockReturnValue({
      ...baseHookReturn,
      loading: false,
      stats: mockStats,
      touchHandlers: {
        onTouchStart: mockTouchStart,
        onTouchMove: vi.fn(),
        onTouchEnd: vi.fn(),
      },
    });
    const { container } = render(<Dashboard />);
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeTruthy();
    fireEvent.touchStart(scrollContainer!);
    expect(mockTouchStart).toHaveBeenCalled();
  });
});
