import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Quests } from '@/pages/Quests';
import type { Quest } from '@/types';

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
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

// Mock PullIndicator
vi.mock('@/hooks/usePullToRefresh', () => ({
  PullIndicator: () => <div data-testid="pull-indicator" />,
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
}));

// Mock apiClient
const mockGetActiveQuests = vi.fn();
const mockGetCompletedQuests = vi.fn();
const mockGetTodayCheckins = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    getActiveQuests: (...args: unknown[]) => mockGetActiveQuests(...args),
    getCompletedQuests: (...args: unknown[]) => mockGetCompletedQuests(...args),
    getTodayCheckins: (...args: unknown[]) => mockGetTodayCheckins(...args),
    completeQuest: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock QuestDetailModal to keep tests focused
vi.mock('@/components/quests/QuestDetailModal', () => ({
  QuestDetailModal: () => <div data-testid="quest-detail-modal" />,
}));

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 1,
  user_id: 1,
  mode_id: 1,
  title: 'Test Quest',
  description: 'A test quest',
  xp_reward: 50,
  frequency: 'daily',
  difficulty: 'easy',
  status: 'active',
  progress: 2,
  target: 5,
  mode: { id: 1, name: 'Fitness', description: 'Stay fit', icon: '💪', color: '#f00', is_active: true },
  ...overrides,
});

describe('Quests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API calls resolve with empty data
    mockGetActiveQuests.mockResolvedValue({ success: true, data: [] });
    mockGetCompletedQuests.mockResolvedValue({ success: true, data: [] });
    mockGetTodayCheckins.mockResolvedValue({ success: true, data: { count: 0 } });
  });

  it('renders loading skeleton initially', () => {
    // Make API calls hang to keep loading state
    mockGetActiveQuests.mockReturnValue(new Promise(() => {}));
    mockGetCompletedQuests.mockReturnValue(new Promise(() => {}));
    renderWithQueryClient(<Quests />);
    // QuestsSkeleton renders pulse placeholders; quest list content not yet visible
    expect(screen.queryByText('Quests')).not.toBeInTheDocument();
    expect(screen.queryByText('No Active Quests')).not.toBeInTheDocument();
  });

  it('renders active quest list after data loads', async () => {
    const quests = [
      makeQuest({ id: 1, title: 'Morning Run', progress: 3, target: 5 }),
      makeQuest({ id: 2, title: 'Drink Water', progress: 1, target: 8, mode_id: 2, mode: { id: 2, name: 'Hydration', description: 'Stay hydrated', icon: '💧', color: '#00f', is_active: true } }),
    ];
    mockGetActiveQuests.mockResolvedValue({ success: true, data: quests });
    mockGetCompletedQuests.mockResolvedValue({ success: true, data: [] });

    renderWithQueryClient(<Quests />);

    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
    });
    expect(screen.getByText('Drink Water')).toBeInTheDocument();
    // Header is visible
    expect(screen.getByText('Quests')).toBeInTheDocument();
  });

  it('shows completion progress bar with X/Y count', async () => {
    const quests = [
      makeQuest({ id: 1, progress: 5, target: 5 }), // ready to claim
      makeQuest({ id: 2, progress: 1, target: 5 }), // not ready
      makeQuest({ id: 3, progress: 3, target: 3 }), // ready to claim
    ];
    mockGetActiveQuests.mockResolvedValue({ success: true, data: quests });

    renderWithQueryClient(<Quests />);

    await waitFor(() => {
      expect(screen.getByText(/2 of 3 quests ready to claim/)).toBeInTheDocument();
    });
  });

  it('shows empty state with "Explore Modes" CTA when no active quests', async () => {
    mockGetActiveQuests.mockResolvedValue({ success: true, data: [] });
    mockGetCompletedQuests.mockResolvedValue({ success: true, data: [] });

    renderWithQueryClient(<Quests />);

    await waitFor(() => {
      expect(screen.getByText('No Active Quests')).toBeInTheDocument();
    });
    const exploreBtn = screen.getByText('Explore Modes');
    expect(exploreBtn).toBeInTheDocument();
    fireEvent.click(exploreBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/settings');
  });

  it('switches between active and completed tabs', async () => {
    const activeQuests = [makeQuest({ id: 1, title: 'Active Quest' })];
    const completedQuests = [makeQuest({ id: 2, title: 'Done Quest', status: 'completed', progress: 5, target: 5 })];
    mockGetActiveQuests.mockResolvedValue({ success: true, data: activeQuests });
    mockGetCompletedQuests.mockResolvedValue({ success: true, data: completedQuests });

    renderWithQueryClient(<Quests />);

    await waitFor(() => {
      expect(screen.getByText('Active Quest')).toBeInTheDocument();
    });
    // Click Completed tab
    fireEvent.click(screen.getByText('Completed'));
    expect(screen.getByText('Done Quest')).toBeInTheDocument();
  });

  it('shows error section on load failure', async () => {
    mockGetActiveQuests.mockRejectedValue(new Error('Network error'));
    mockGetCompletedQuests.mockRejectedValue(new Error('Network error'));

    renderWithQueryClient(<Quests />);

    await waitFor(() => {
      expect(screen.getByText('Could not load your quests')).toBeInTheDocument();
    });
    expect(screen.getByText(/Try Again/)).toBeInTheDocument();
  });
});
