import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  BookOpen: (props: any) => <span data-testid="book-open" {...props} />,
  Sparkles: (props: any) => <span data-testid="sparkles" {...props} />,
  Clock: (props: any) => <span data-testid="clock" {...props} />,
}));

// Mock useContentFeed hook
const mockSetCategory = vi.fn();
const mockLoadMore = vi.fn().mockResolvedValue(undefined);
const mockRefresh = vi.fn().mockResolvedValue(undefined);

const defaultHookReturn = {
  articles: [],
  loading: false,
  error: null,
  category: 'all' as const,
  setCategory: mockSetCategory,
  hasMore: false,
  loadMore: mockLoadMore,
  loadingMore: false,
  refresh: mockRefresh,
  articlesReadThisWeek: 0,
  totalXp: 0,
};

vi.mock('@/hooks/useContentFeed', () => ({
  useContentFeed: vi.fn(() => defaultHookReturn),
}));

// Mock useTelegram
const mockHaptic = { impact: vi.fn(), notification: vi.fn() };
const mockNavigate = vi.fn();

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic, user: { id: 1 } }),
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

// Mock ContentCard
vi.mock('@/components/content/ContentCard', () => ({
  ContentCard: ({ article, onClick }: any) => (
    <button data-testid={`card-${article.id}`} onClick={() => onClick(article.id)}>
      {article.title}
    </button>
  ),
}));

import { ContentFeed } from '@/pages/ContentFeed';
import { useContentFeed } from '@/hooks/useContentFeed';

const mockUseContentFeed = vi.mocked(useContentFeed);

function renderFeed() {
  return render(
    <MemoryRouter>
      <ContentFeed />
    </MemoryRouter>,
  );
}

const sampleArticle = {
  id: 1,
  title: 'Budget Basics',
  summary: 'Learn to budget',
  body_html: '<p>body</p>',
  category: 'finance',
  read_time_min: 5,
  xp_reward: 25,
  cover_emoji: '💰',
  difficulty: 'beginner',
  tags: [],
  is_published: true,
  created_at: '2026-01-01T00:00:00Z',
  is_read: false,
};

describe('ContentFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseContentFeed.mockReturnValue(defaultHookReturn);
  });

  it('renders skeleton while loading', () => {
    mockUseContentFeed.mockReturnValue({ ...defaultHookReturn, loading: true });
    renderFeed();
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
  });

  it('renders error section on error', () => {
    mockUseContentFeed.mockReturnValue({ ...defaultHookReturn, error: 'Network error' });
    renderFeed();
    expect(screen.getByTestId('error-section')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders empty state when no articles', () => {
    renderFeed();
    expect(screen.getByText('No articles yet')).toBeInTheDocument();
  });

  it('renders article cards', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any, { ...sampleArticle, id: 2, title: 'Health 101' }],
    });
    renderFeed();
    expect(screen.getByTestId('card-1')).toBeInTheDocument();
    expect(screen.getByTestId('card-2')).toBeInTheDocument();
  });

  it('displays category tabs', () => {
    renderFeed();
    expect(screen.getByRole('tab', { name: /^All$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Finance$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Health$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^Productivity$/i })).toBeInTheDocument();
  });

  it('marks current category tab as selected', () => {
    mockUseContentFeed.mockReturnValue({ ...defaultHookReturn, category: 'finance' });
    renderFeed();
    const financeTab = screen.getByRole('tab', { name: /^Finance$/i });
    expect(financeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('calls setCategory and haptic on tab click', () => {
    renderFeed();
    fireEvent.click(screen.getByRole('tab', { name: /^Health$/i }));
    expect(mockSetCategory).toHaveBeenCalledWith('health');
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('shows stats header with articles read and XP', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articlesReadThisWeek: 7,
      totalXp: 175,
    });
    renderFeed();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('175')).toBeInTheDocument();
  });

  it('renders load more button when hasMore is true', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any],
      hasMore: true,
    });
    renderFeed();
    expect(screen.getByText('Load More')).toBeInTheDocument();
  });

  it('calls loadMore when load more button is clicked', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any],
      hasMore: true,
    });
    renderFeed();
    fireEvent.click(screen.getByText('Load More'));
    expect(mockLoadMore).toHaveBeenCalled();
  });

  it('disables load more button while loading more', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any],
      hasMore: true,
      loadingMore: true,
    });
    renderFeed();
    const btn = screen.getByText('...');
    expect(btn).toBeDisabled();
  });

  it('navigates to article on card click', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any],
    });
    renderFeed();
    fireEvent.click(screen.getByTestId('card-1'));
    expect(mockNavigate).toHaveBeenCalledWith('/content/1');
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('does not show load more button when hasMore is false', () => {
    mockUseContentFeed.mockReturnValue({
      ...defaultHookReturn,
      articles: [sampleArticle as any],
      hasMore: false,
    });
    renderFeed();
    expect(screen.queryByText('Load More')).not.toBeInTheDocument();
  });
});
