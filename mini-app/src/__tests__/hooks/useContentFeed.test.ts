import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mock fetchContentFeed
const mockFetchContentFeed = vi.fn();
vi.mock('@/api/content', () => ({
  fetchContentFeed: (...args: any[]) => mockFetchContentFeed(...args),
}));

import { useContentFeed } from '@/hooks/useContentFeed';

const sampleArticles = [
  {
    id: 1, title: 'A1', summary: 's', body_html: '<p>b</p>', category: 'finance',
    read_time_min: 5, xp_reward: 25, cover_emoji: '💰', difficulty: 'beginner',
    tags: [], is_published: true, created_at: '2026-01-01', is_read: true,
  },
  {
    id: 2, title: 'A2', summary: 's', body_html: '<p>b</p>', category: 'health',
    read_time_min: 3, xp_reward: 15, cover_emoji: '🏃', difficulty: 'beginner',
    tags: [], is_published: true, created_at: '2026-01-02', is_read: false,
  },
];

const feedResponse = {
  articles: sampleArticles,
  total: 20,
  totalPages: 2,
  page: 1,
};

describe('useContentFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchContentFeed.mockResolvedValue(feedResponse);
  });

  it('loads articles on mount', async () => {
    const { result } = renderHook(() => useContentFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.articles).toHaveLength(2);
    expect(result.current.articles[0].title).toBe('A1');
  });

  it('starts with loading true', () => {
    mockFetchContentFeed.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useContentFeed());
    expect(result.current.loading).toBe(true);
  });

  it('defaults category to all', () => {
    const { result } = renderHook(() => useContentFeed());
    expect(result.current.category).toBe('all');
  });

  it('calculates articlesReadThisWeek from articles with is_read=true', async () => {
    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.articlesReadThisWeek).toBe(1);
  });

  it('calculates totalXp from read articles', async () => {
    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.totalXp).toBe(25); // only article id=1 (is_read=true, xp=25)
  });

  it('sets hasMore based on totalPages', async () => {
    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasMore).toBe(true);
  });

  it('reloads on category change', async () => {
    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const initialCallCount = mockFetchContentFeed.mock.calls.length;

    act(() => { result.current.setCategory('health'); });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetchContentFeed.mock.calls.length).toBeGreaterThan(initialCallCount);
    expect(result.current.category).toBe('health');
  });

  it('sets error on fetch failure', async () => {
    mockFetchContentFeed.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });

  it('refresh reloads page 1', async () => {
    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const callCount = mockFetchContentFeed.mock.calls.length;

    await act(async () => { await result.current.refresh(); });

    expect(mockFetchContentFeed.mock.calls.length).toBeGreaterThan(callCount);
  });

  it('loadMore appends articles', async () => {
    const page2Response = {
      articles: [{ ...sampleArticles[0], id: 3, title: 'A3' }],
      total: 20,
      totalPages: 2,
      page: 2,
    };

    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockFetchContentFeed.mockResolvedValue(page2Response);
    await act(async () => { await result.current.loadMore(); });

    expect(result.current.articles).toHaveLength(3);
  });

  it('loadMore does nothing when hasMore is false', async () => {
    mockFetchContentFeed.mockResolvedValue({
      articles: sampleArticles,
      total: 2,
      totalPages: 1,
      page: 1,
    });

    const { result } = renderHook(() => useContentFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.hasMore).toBe(false);
    const callCount = mockFetchContentFeed.mock.calls.length;

    await act(async () => { await result.current.loadMore(); });

    expect(mockFetchContentFeed.mock.calls.length).toBe(callCount);
  });
});
