import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Bookmark: (props: any) => <span data-testid="bookmark-icon" {...props} />,
  BookmarkCheck: (props: any) => <span data-testid="bookmark-check-icon" {...props} />,
  Clock: (props: any) => <span data-testid="clock-icon" {...props} />,
  Sparkles: (props: any) => <span data-testid="sparkles-icon" {...props} />,
  ChevronRight: (props: any) => <span data-testid="chevron-right" {...props} />,
  BookOpen: (props: any) => <span data-testid="book-open" {...props} />,
  ArrowUp: (props: any) => <span data-testid="arrow-up" {...props} />,
}));

// Mock useTelegram
const mockHaptic = { impact: vi.fn(), notification: vi.fn() };
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ user: { id: 42 }, haptic: mockHaptic }),
  useBackButton: vi.fn(),
}));

// Mock Toast
vi.mock('@/components/Toast', () => ({
  Toast: ({ message, variant, onDismiss }: any) => (
    <div data-testid="toast" data-variant={variant}>
      {message}
      <button onClick={onDismiss}>dismiss</button>
    </div>
  ),
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

const sampleArticle = {
  id: 1,
  title: 'Budget Basics',
  summary: 'Learn to budget effectively.',
  body_html: '<p>Budgeting is important.</p>',
  category: 'finance',
  read_time_min: 5,
  xp_reward: 25,
  cover_emoji: '💰',
  difficulty: 'beginner',
  tags: ['saving', 'tips'],
  is_published: true,
  created_at: '2026-01-01T00:00:00Z',
};

const sampleRelated = [
  { id: 2, title: 'Advanced Budgeting', cover_emoji: '📊', category: 'finance', read_time_min: 8, xp_reward: 35 },
];

// Mock fetch at global level
const mockFetchFn = vi.fn();
global.fetch = mockFetchFn;

function successResponse(data: unknown) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true, data }),
  });
}

function errorResponse(status: number, error: string) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ error }),
  });
}

import { ArticleReader } from '@/pages/ArticleReader';

function renderReader(articleId = '1') {
  return render(
    <MemoryRouter initialEntries={[`/content/${articleId}`]}>
      <Routes>
        <Route path="/content/:articleId" element={<ArticleReader />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ArticleReader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: article loads successfully, related returns, bookmarks check returns empty
    mockFetchFn.mockImplementation((url: string) => {
      if (url.includes('/related')) return successResponse(sampleRelated);
      if (url.includes('/bookmarks/')) return successResponse([]);
      if (url.includes('/content/1')) return successResponse(sampleArticle);
      return successResponse({});
    });
  });

  it('shows skeleton while loading', () => {
    // Make fetch hang
    mockFetchFn.mockImplementation(() => new Promise(() => {}));
    renderReader();
    expect(screen.getByRole('status', { name: /loading article/i })).toBeInTheDocument();
  });

  it('renders article title after load', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('Budget Basics')).toBeInTheDocument();
    });
  });

  it('renders article summary', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('Learn to budget effectively.')).toBeInTheDocument();
    });
  });

  it('renders article body HTML', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('Budgeting is important.')).toBeInTheDocument();
    });
  });

  it('renders category badge', async () => {
    renderReader();
    await waitFor(() => {
      const financeElements = screen.getAllByText('finance');
      expect(financeElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders tags', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('#saving')).toBeInTheDocument();
      expect(screen.getByText('#tips')).toBeInTheDocument();
    });
  });

  it('renders related articles section', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('Related Articles')).toBeInTheDocument();
      expect(screen.getByText('Advanced Budgeting')).toBeInTheDocument();
    });
  });

  it('shows error section when article fails to load', async () => {
    mockFetchFn.mockImplementation((url: string) => {
      if (url.includes('/content/1') && !url.includes('/related') && !url.includes('/bookmarks'))
        return errorResponse(500, 'Server error');
      return successResponse([]);
    });
    renderReader();
    await waitFor(() => {
      expect(screen.getByTestId('error-section')).toBeInTheDocument();
    });
  });

  it('shows Take Quiz button', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText(/Take Quiz/)).toBeInTheDocument();
    });
  });

  it('shows bookmark button', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByLabelText(/bookmark/i)).toBeInTheDocument();
    });
  });

  it('shows reading progress section', async () => {
    renderReader();
    await waitFor(() => {
      expect(screen.getByText('Reading Progress')).toBeInTheDocument();
    });
  });
});
