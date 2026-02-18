/**
 * Tests for ActivityHub page (mini-app/src/pages/ActivityHub.tsx)
 *
 * Tests rendering, category filtering, search, card display, quick log, timer nav.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'activityHub.title': 'Activity Hub',
        'activityHub.searchPlaceholder': 'Search activities...',
        'activityHub.categories.all': 'All',
        'activityHub.categories.cardio': 'Cardio',
        'activityHub.categories.strength': 'Strength',
        'activityHub.categories.flexibility': 'Flexibility',
        'activityHub.categories.sports': 'Sports',
        'activityHub.categories.outdoor': 'Outdoor',
        'activityHub.categories.mindBody': 'Mind-Body',
        'activityHub.quickLog': 'Quick Log',
        'activityHub.startTimer': 'Start Timer',
        'activityHub.lastDone': 'Last done',
        'activityHub.never': 'Never',
        'activityHub.personalRecord': 'PR',
        'activityHub.thisWeek': 'This week',
        'activityHub.caloriesBurned': 'Calories',
        'activityHub.noActivities': 'No activities found',
        'activityHub.minutes': 'min',
        'activityHub.calories': 'cal',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock useTelegram
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({
    user: { id: 123 },
    haptic: mockHaptic,
  }),
  useBackButton: vi.fn(),
}));

// Mock usePullToRefresh
vi.mock('@/hooks/usePullToRefresh', () => ({
  PullIndicator: () => <div data-testid="pull-indicator" />,
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {},
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => <div className={className}>{children}</div>,
    button: ({ children, onClick, disabled, className, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Search: (props: any) => <span data-testid="icon-search" {...props} />,
  Activity: (props: any) => <span data-testid="icon-activity" {...props} />,
  Flame: (props: any) => <span data-testid="icon-flame" {...props} />,
  Timer: (props: any) => <span data-testid="icon-timer" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
}));

// Mock Toast component
vi.mock('@/components/Toast', () => ({
  Toast: ({ message }: { message: string }) => <div data-testid="toast">{message}</div>,
}));

// Mock ErrorSection
vi.mock('@/components/ErrorSection', () => ({
  ErrorSection: ({ message, onRetry }: any) => (
    <div data-testid="error-section">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock useActivities hook
const mockQuickLog = vi.fn();
const mockRefresh = vi.fn();
const mockSetCategory = vi.fn();
const mockSetSearchQuery = vi.fn();

let mockActivitiesReturn: any = {
  filteredActivities: [],
  activitiesThisWeek: 0,
  caloriesBurnedThisWeek: 0,
  loading: false,
  error: null,
  category: 'all' as const,
  setCategory: mockSetCategory,
  searchQuery: '',
  setSearchQuery: mockSetSearchQuery,
  quickLog: mockQuickLog,
  refresh: mockRefresh,
};

vi.mock('@/hooks/useActivities', () => ({
  useActivities: () => mockActivitiesReturn,
}));

// Mock ActivityCard — render a simplified version
vi.mock('@/components/activity/ActivityCard', () => ({
  ActivityCard: ({ activity, onQuickLog, onStartTimer }: any) => (
    <div data-testid={`activity-card-${activity.id}`}>
      <span>{activity.name}</span>
      <span>{activity.category}</span>
      <button onClick={() => onQuickLog(activity.id)}>Quick Log</button>
      <button onClick={() => onStartTimer(activity.id)}>Start Timer</button>
    </div>
  ),
}));

import { ActivityHub } from '@/pages/ActivityHub';

describe('ActivityHub', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivitiesReturn = {
      filteredActivities: [],
      activitiesThisWeek: 0,
      caloriesBurnedThisWeek: 0,
      loading: false,
      error: null,
      category: 'all',
      setCategory: mockSetCategory,
      searchQuery: '',
      setSearchQuery: mockSetSearchQuery,
      quickLog: mockQuickLog,
      refresh: mockRefresh,
    };
  });

  it('renders loading skeleton when loading', () => {
    mockActivitiesReturn.loading = true;
    render(<ActivityHub />);

    expect(screen.getByRole('status', { name: 'Loading activities' })).toBeInTheDocument();
  });

  it('renders error section on error', () => {
    mockActivitiesReturn.error = 'Failed to load';
    render(<ActivityHub />);

    expect(screen.getByTestId('error-section')).toBeInTheDocument();
    expect(screen.getByText('Failed to load')).toBeInTheDocument();
  });

  it('renders title and stats after loading', () => {
    mockActivitiesReturn.activitiesThisWeek = 12;
    mockActivitiesReturn.caloriesBurnedThisWeek = 3500;
    render(<ActivityHub />);

    expect(screen.getByText('Activity Hub')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('3500')).toBeInTheDocument();
  });

  it('renders category tabs', () => {
    render(<ActivityHub />);

    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Cardio' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Strength' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Flexibility' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Sports' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Outdoor' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Mind-Body' })).toBeInTheDocument();
  });

  it('marks current category as selected', () => {
    mockActivitiesReturn.category = 'cardio';
    render(<ActivityHub />);

    const cardioTab = screen.getByRole('tab', { name: 'Cardio' });
    expect(cardioTab).toHaveAttribute('aria-selected', 'true');

    const allTab = screen.getByRole('tab', { name: 'All' });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('calls setCategory when category tab clicked', () => {
    render(<ActivityHub />);

    fireEvent.click(screen.getByRole('tab', { name: 'Cardio' }));
    expect(mockSetCategory).toHaveBeenCalledWith('cardio');
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('renders activity cards when activities exist', () => {
    mockActivitiesReturn.filteredActivities = [
      { id: 1, name: 'Running', category: 'cardio', icon_emoji: '🏃', last_done: null, times_done: 0, personal_record_duration: null, personal_record_calories: null },
      { id: 2, name: 'Push-ups', category: 'strength', icon_emoji: '💪', last_done: null, times_done: 0, personal_record_duration: null, personal_record_calories: null },
    ];
    render(<ActivityHub />);

    expect(screen.getByTestId('activity-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('activity-card-2')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Push-ups')).toBeInTheDocument();
  });

  it('shows empty state when no activities match', () => {
    mockActivitiesReturn.filteredActivities = [];
    render(<ActivityHub />);

    expect(screen.getByText('No activities found')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<ActivityHub />);

    const searchInput = screen.getByPlaceholderText('Search activities...');
    expect(searchInput).toBeInTheDocument();
  });

  it('calls setSearchQuery on search input change', () => {
    render(<ActivityHub />);

    const searchInput = screen.getByPlaceholderText('Search activities...');
    fireEvent.change(searchInput, { target: { value: 'run' } });
    expect(mockSetSearchQuery).toHaveBeenCalledWith('run');
  });

  it('handles quick log action', async () => {
    mockQuickLog.mockResolvedValueOnce({ xp_awarded: 50 });
    mockActivitiesReturn.filteredActivities = [
      { id: 1, name: 'Running', category: 'cardio', icon_emoji: '🏃', last_done: null, times_done: 0, personal_record_duration: null, personal_record_calories: null },
    ];
    render(<ActivityHub />);

    fireEvent.click(screen.getByText('Quick Log'));

    await waitFor(() => {
      expect(mockQuickLog).toHaveBeenCalledWith(1);
    });
  });

  it('navigates to timer on start timer action', () => {
    mockActivitiesReturn.filteredActivities = [
      { id: 5, name: 'Running', category: 'cardio', icon_emoji: '🏃', last_done: null, times_done: 0, personal_record_duration: null, personal_record_calories: null },
    ];
    render(<ActivityHub />);

    fireEvent.click(screen.getByText('Start Timer'));
    expect(mockNavigate).toHaveBeenCalledWith('/activity/timer/5');
  });
});
