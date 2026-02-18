import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BookOpen: (props: any) => <span data-testid="book-open" {...props} />,
  Bookmark: (props: any) => <span data-testid="bookmark-icon" {...props} />,
  BarChart3: (props: any) => <span data-testid="bar-chart" {...props} />,
  Clock: (props: any) => <span data-testid="clock" {...props} />,
  Star: (props: any) => <span data-testid="star" {...props} />,
  Zap: (props: any) => <span data-testid="zap" {...props} />,
  Flame: (props: any) => <span data-testid="flame" {...props} />,
  Trophy: (props: any) => <span data-testid="trophy" {...props} />,
  TrendingUp: (props: any) => <span data-testid="trending-up" {...props} />,
  BookmarkX: (props: any) => <span data-testid="bookmark-x" {...props} />,
  CheckCircle: (props: any) => <span data-testid="check-circle" {...props} />,
}));

// Mock useTelegram
const mockHaptic = { impact: vi.fn(), notification: vi.fn() };
const mockNavigate = vi.fn();

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ user: { id: 42 }, haptic: mockHaptic }),
  useBackButton: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock usePullToRefresh
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: () => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {},
  }),
  PullIndicator: () => null,
}));

// Mock ErrorSection
vi.mock('@/components/ErrorSection', () => ({
  ErrorSection: ({ message, onRetry }: any) => (
    <div data-testid="error-section">
      <span>{message}</span>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));

// Mock useReadingHistory
const mockSetTab = vi.fn();
const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockRemoveBookmark = vi.fn().mockResolvedValue(undefined);

const emptyStats = {
  total_articles_read: 0,
  average_quiz_score: 0,
  total_xp_from_content: 0,
  reading_streak: 0,
  favorite_category: null,
  categories_breakdown: {},
};

const defaultHookReturn = {
  history: [] as any[],
  bookmarks: [] as any[],
  stats: emptyStats,
  loading: false,
  error: null as string | null,
  tab: 'history' as const,
  setTab: mockSetTab,
  refresh: mockRefresh,
  removeBookmark: mockRemoveBookmark,
};

vi.mock('@/hooks/useReadingHistory', () => ({
  useReadingHistory: vi.fn(() => defaultHookReturn),
}));

import { ReadingHistory } from '@/pages/ReadingHistory';
import { useReadingHistory } from '@/hooks/useReadingHistory';

const mockUseReadingHistory = vi.mocked(useReadingHistory);

function renderHistory() {
  return render(
    <MemoryRouter>
      <ReadingHistory />
    </MemoryRouter>,
  );
}

const sampleHistoryEntry = {
  article_id: 1,
  title: 'Budget Basics',
  summary: 'Learn budgeting',
  category: 'finance',
  cover_emoji: '💰',
  read_time_min: 5,
  xp_earned: 25,
  quiz_score: 80,
  read_at: new Date().toISOString(),
};

const sampleBookmark = {
  article_id: 2,
  title: 'Health Tips',
  summary: 'Stay healthy',
  category: 'health',
  cover_emoji: '🏃',
  read_time_min: 3,
  xp_reward: 15,
  is_read: false,
  bookmarked_at: '2026-01-15T10:00:00Z',
};

describe('ReadingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReadingHistory.mockReturnValue(defaultHookReturn);
  });

  it('renders the header', () => {
    renderHistory();
    expect(screen.getByText('Reading History')).toBeInTheDocument();
    expect(screen.getByText('Track your knowledge journey')).toBeInTheDocument();
  });

  it('renders three tab buttons', () => {
    renderHistory();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    expect(screen.getByText('Stats')).toBeInTheDocument();
  });

  it('shows error section on error', () => {
    mockUseReadingHistory.mockReturnValue({ ...defaultHookReturn, error: 'Server error' });
    renderHistory();
    expect(screen.getByTestId('error-section')).toBeInTheDocument();
    expect(screen.getByText('Server error')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    renderHistory();
    expect(screen.getByText('No articles read yet')).toBeInTheDocument();
  });

  it('renders history entries', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      history: [sampleHistoryEntry],
    });
    renderHistory();
    expect(screen.getByText('Budget Basics')).toBeInTheDocument();
    expect(screen.getByText('+25 XP')).toBeInTheDocument();
    expect(screen.getByText('Quiz: 80%')).toBeInTheDocument();
  });

  it('navigates to article on history entry click', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      history: [sampleHistoryEntry],
    });
    renderHistory();
    fireEvent.click(screen.getByText('Budget Basics'));
    expect(mockNavigate).toHaveBeenCalledWith('/content/1');
  });

  it('switches to bookmarks tab', () => {
    renderHistory();
    fireEvent.click(screen.getByText('Bookmarks'));
    expect(mockSetTab).toHaveBeenCalledWith('bookmarks');
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('shows bookmarks tab empty state', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'bookmarks',
    });
    renderHistory();
    expect(screen.getByText('No bookmarks yet')).toBeInTheDocument();
  });

  it('renders bookmarks with remove button', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'bookmarks',
      bookmarks: [sampleBookmark],
    });
    renderHistory();
    expect(screen.getByText('Health Tips')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove bookmark')).toBeInTheDocument();
  });

  it('calls removeBookmark on remove click', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'bookmarks',
      bookmarks: [sampleBookmark],
    });
    renderHistory();
    fireEvent.click(screen.getByLabelText('Remove bookmark'));
    expect(mockRemoveBookmark).toHaveBeenCalledWith(2);
  });

  it('shows stats tab with overview cards', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'stats',
      stats: {
        total_articles_read: 15,
        average_quiz_score: 75,
        total_xp_from_content: 350,
        reading_streak: 5,
        favorite_category: 'finance',
        categories_breakdown: { finance: 8, health: 4, productivity: 3 },
      },
    });
    renderHistory();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('350')).toBeInTheDocument();
    expect(screen.getByText('5d')).toBeInTheDocument();
  });

  it('shows favorite category when available', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'stats',
      stats: {
        total_articles_read: 10,
        average_quiz_score: 70,
        total_xp_from_content: 200,
        reading_streak: 3,
        favorite_category: 'health',
        categories_breakdown: { health: 5, finance: 3, productivity: 2 },
      },
    });
    renderHistory();
    expect(screen.getByText('Favorite Category')).toBeInTheDocument();
    // "health" appears in both the favorite badge and the breakdown row
    const healthElements = screen.getAllByText('health');
    expect(healthElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows category breakdown bars', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      tab: 'stats',
      stats: {
        total_articles_read: 10,
        average_quiz_score: 70,
        total_xp_from_content: 200,
        reading_streak: 3,
        favorite_category: 'finance',
        categories_breakdown: { finance: 5, health: 3 },
      },
    });
    renderHistory();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    // Multiple "X articles" labels in breakdown + favorite section
    const fiveArticles = screen.getAllByText('5 articles');
    expect(fiveArticles.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('3 articles')).toBeInTheDocument();
  });

  it('shows skeleton while loading', () => {
    mockUseReadingHistory.mockReturnValue({
      ...defaultHookReturn,
      loading: true,
    });
    renderHistory();
    // Skeleton renders pulse animations — look for the animated elements
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });
});
