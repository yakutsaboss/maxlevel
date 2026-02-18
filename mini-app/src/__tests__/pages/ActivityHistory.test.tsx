/**
 * Tests for ActivityHistory page (mini-app/src/pages/ActivityHistory.tsx)
 *
 * Tests: title rendering, loading skeleton, empty state, data display,
 * weekly stats, personal records, load more, error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'activityHistory.title': 'Activity History',
        'activityHistory.noActivities': 'No activities yet',
        'activityHistory.weeklyStats': 'This Week',
        'activityHistory.personalRecords': 'Personal Records',
        'activityHistory.longestRun': 'Longest Run',
        'activityHistory.mostCalories': 'Most Calories',
        'activityHistory.longestStreak': 'Longest Streak',
        'activityHistory.loadMore': 'Load More',
        'activityHistory.thisMonth': 'This Month',
        'activityHistory.totalWorkouts': 'Workouts',
        'activityHistory.avgDuration': 'Duration',
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

// Mock ErrorSection
vi.mock('@/components/ErrorSection', () => ({
  ErrorSection: ({ message, onRetry }: any) => (
    <div data-testid="error-section">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock ActivityCalendar
vi.mock('@/components/activity/ActivityCalendar', () => ({
  ActivityCalendar: ({ data }: any) => (
    <div data-testid="activity-calendar">Calendar ({data?.length ?? 0} days)</div>
  ),
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

// Mock lucide-react
vi.mock('lucide-react', () => ({
  History: (props: any) => <span data-testid="icon-history" {...props} />,
  Calendar: (props: any) => <span data-testid="icon-calendar" {...props} />,
  TrendingUp: (props: any) => <span data-testid="icon-trending-up" {...props} />,
  TrendingDown: (props: any) => <span data-testid="icon-trending-down" {...props} />,
  Trophy: (props: any) => <span data-testid="icon-trophy" {...props} />,
  Flame: (props: any) => <span data-testid="icon-flame" {...props} />,
  Timer: (props: any) => <span data-testid="icon-timer" {...props} />,
  Dumbbell: (props: any) => <span data-testid="icon-dumbbell" {...props} />,
  Footprints: (props: any) => <span data-testid="icon-footprints" {...props} />,
  Bike: (props: any) => <span data-testid="icon-bike" {...props} />,
  Waves: (props: any) => <span data-testid="icon-waves" {...props} />,
  Zap: (props: any) => <span data-testid="icon-zap" {...props} />,
}));

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { ActivityHistory } from '@/pages/ActivityHistory';

// ─── Fetch mocking helpers ────────────────────────────────────────

const mockHistoryResponse = {
  success: true,
  data: {
    activities: [
      { id: 1, name: 'Morning Run', type: 'running', duration: 30, calories: 300, created_at: new Date().toISOString() },
      { id: 2, name: 'Gym Workout', type: 'strength', duration: 45, calories: 200, created_at: new Date().toISOString() },
    ],
    total_count: 5,
  },
};

const mockStatsResponse = {
  success: true,
  data: {
    calendar: [{ date: '2026-02-18', count: 2 }],
    weekly: {
      total_activities: 5,
      total_duration: 120,
      total_calories: 800,
      prev_week_activities: 3,
      prev_week_duration: 90,
      prev_week_calories: 600,
    },
    records: {
      longest_duration: 60,
      most_calories: 500,
      longest_streak: 7,
    },
  },
};

function setupFetchMock(historyOk = true, statsOk = true) {
  const fetchMock = vi.fn();
  fetchMock.mockImplementation((url: string) => {
    if (url.includes('/history')) {
      if (!historyOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockHistoryResponse),
      });
    }
    if (url.includes('/stats')) {
      if (!statsOk) return Promise.resolve({ ok: false, status: 500 });
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockStatsResponse),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  global.fetch = fetchMock;
  return fetchMock;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('ActivityHistory', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders the page title after loading', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('Activity History')).toBeInTheDocument();
    });
  });

  it('shows activity calendar after loading', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('activity-calendar')).toBeInTheDocument();
    });
  });

  it('displays weekly statistics', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument(); // total_activities
    });
  });

  it('displays personal records section', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('Longest Run')).toBeInTheDocument();
      expect(screen.getByText('Most Calories')).toBeInTheDocument();
      expect(screen.getByText('Longest Streak')).toBeInTheDocument();
    });
  });

  it('shows activity entries', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('Morning Run')).toBeInTheDocument();
      expect(screen.getByText('Gym Workout')).toBeInTheDocument();
    });
  });

  it('shows empty state when no activities', async () => {
    const fetchMock = vi.fn();
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { activities: [], total_count: 0 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          data: {
            calendar: [],
            weekly: { total_activities: 0, total_duration: 0, total_calories: 0, prev_week_activities: 0, prev_week_duration: 0, prev_week_calories: 0 },
            records: { longest_duration: 0, most_calories: 0, longest_streak: 0 },
          },
        }),
      });
    });
    global.fetch = fetchMock;

    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('No activities yet')).toBeInTheDocument();
    });
  });

  it('shows load more button when more activities exist', async () => {
    setupFetchMock();
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });
  });

  it('shows error section on API failure', async () => {
    setupFetchMock(false); // history request fails
    render(<ActivityHistory />);

    await waitFor(() => {
      expect(screen.getByTestId('error-section')).toBeInTheDocument();
    });
  });
});
