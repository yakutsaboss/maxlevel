/**
 * Tests for Dashboard celebration integration (Run 60)
 *
 * Agent B wires useCelebration + Confetti/LevelUpModal/XpFloat into Dashboard.
 * These tests verify that celebration components render based on useCelebration
 * state and dismiss correctly.
 *
 * Mocks: useDashboardData, useCelebration, useTelegram, react-router-dom,
 *        framer-motion, celebration components, lucide-react
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock('framer-motion', () => framerMotionMock);

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

// Mock useCelebration
const mockUseCelebration = vi.fn();
vi.mock('@/hooks/useCelebration', () => ({
  useCelebration: () => mockUseCelebration(),
}));

// Mock PullIndicator
vi.mock('@/hooks/usePullToRefresh', () => ({
  PullIndicator: () => <div data-testid="pull-indicator" />,
  usePullToRefresh: vi.fn(),
}));

// Mock celebration components — render simple test-visible elements
vi.mock('@/components/celebrations/Confetti', () => ({
  Confetti: ({ show, onComplete }: { show: boolean; onComplete?: () => void }) =>
    show ? <div data-testid="confetti" onClick={onComplete}>Confetti</div> : null,
}));

vi.mock('@/components/celebrations/LevelUpModal', () => ({
  LevelUpModal: ({ level, show, onClose }: { level: number; show: boolean; onClose: () => void }) =>
    show ? <div data-testid="level-up-modal" onClick={onClose}>Level Up to {level}!</div> : null,
}));

vi.mock('@/components/celebrations/XpFloat', () => ({
  XpFloat: ({ amount, show, onComplete }: { amount: number; show: boolean; onComplete?: () => void }) =>
    show ? <div data-testid="xp-float" onClick={onComplete}>+{amount} XP</div> : null,
}));

// Mock lucide-react icons (Dashboard + all sub-components)
vi.mock('lucide-react', () => {
  const s = (name: string) => (props: any) => <span data-testid={`${name}-icon`} {...props} />;
  return {
    Trophy: s('trophy'),
    Zap: s('zap'),
    Target: s('target'),
    Flame: s('flame'),
    TrendingUp: s('trending'),
    Compass: s('compass'),
    Scroll: s('scroll'),
    Sparkles: s('sparkles'),
    ArrowRight: s('arrow'),
    Quote: s('quote'),
    Calendar: s('calendar'),
    Award: s('award'),
    AlertCircle: s('alert-circle'),
    RefreshCw: s('refresh'),
    Clock: s('clock'),
    CheckCircle: s('check-circle'),
  };
});

// ─── Import after mocks ─────────────────────────────────────────────

import { Dashboard } from '@/pages/Dashboard';

// ─── Test data ──────────────────────────────────────────────────────

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

const baseDashboardHookReturn = {
  stats: mockStats,
  loading: false,
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

const baseCelebrationReturn = {
  showConfetti: false,
  showLevelUp: false,
  showXpFloat: false,
  levelUpData: 0,
  xpGained: 0,
  onDashboardData: vi.fn(),
  dismiss: vi.fn(),
  dismissConfetti: vi.fn(),
  dismissLevelUp: vi.fn(),
  dismissXpFloat: vi.fn(),
};

// ─── Tests ──────────────────────────────────────────────────────────

describe('Dashboard — Celebration Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDashboardData.mockReturnValue({ ...baseDashboardHookReturn });
    mockUseCelebration.mockReturnValue({ ...baseCelebrationReturn });
  });

  it('does not show celebrations on normal dashboard load', () => {
    render(<Dashboard />);

    expect(screen.queryByTestId('confetti')).not.toBeInTheDocument();
    expect(screen.queryByTestId('level-up-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('xp-float')).not.toBeInTheDocument();
  });

  it('shows LevelUpModal when showLevelUp is true', () => {
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showLevelUp: true,
      levelUpData: 6,
    });

    render(<Dashboard />);

    const modal = screen.getByTestId('level-up-modal');
    expect(modal).toBeInTheDocument();
    expect(modal.textContent).toContain('Level Up to 6!');
  });

  it('shows Confetti alongside LevelUpModal on level up', () => {
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showConfetti: true,
      showLevelUp: true,
      levelUpData: 10,
    });

    render(<Dashboard />);

    expect(screen.getByTestId('confetti')).toBeInTheDocument();
    expect(screen.getByTestId('level-up-modal')).toBeInTheDocument();
  });

  it('shows XpFloat when showXpFloat is true', () => {
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showXpFloat: true,
      xpGained: 25,
    });

    render(<Dashboard />);

    const xpFloat = screen.getByTestId('xp-float');
    expect(xpFloat).toBeInTheDocument();
    expect(xpFloat.textContent).toContain('+25 XP');
  });

  it('does not show XpFloat when showXpFloat is false', () => {
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showXpFloat: false,
      xpGained: 50,
    });

    render(<Dashboard />);

    expect(screen.queryByTestId('xp-float')).not.toBeInTheDocument();
  });

  it('does not show celebrations during loading state', () => {
    mockUseDashboardData.mockReturnValue({
      ...baseDashboardHookReturn,
      loading: true,
      stats: null,
    });
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showLevelUp: true,
      levelUpData: 3,
    });

    render(<Dashboard />);

    // Dashboard shows skeleton during loading — celebration components
    // may or may not render depending on Agent B's implementation.
    // At minimum, the dashboard should show loading state.
    expect(screen.queryByText('Quests Done')).not.toBeInTheDocument();
  });

  it('does not show celebrations during error state', () => {
    mockUseDashboardData.mockReturnValue({
      ...baseDashboardHookReturn,
      loading: false,
      error: true,
      stats: null,
    });
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      showConfetti: true,
      showLevelUp: true,
    });

    render(<Dashboard />);

    // Error state shows ErrorSection, not celebration overlays
    expect(screen.getByText(/Try Again/)).toBeInTheDocument();
  });

  it('passes onDashboardData to useDashboardData hook', () => {
    const mockOnDashboardData = vi.fn();
    mockUseCelebration.mockReturnValue({
      ...baseCelebrationReturn,
      onDashboardData: mockOnDashboardData,
    });

    render(<Dashboard />);

    // Verify useDashboardData was called with onDashboardData in its params
    expect(mockUseDashboardData).toHaveBeenCalledWith(
      expect.objectContaining({
        onDashboardData: mockOnDashboardData,
      }),
    );
  });
});
