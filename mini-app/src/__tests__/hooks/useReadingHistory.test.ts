import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useReadingHistory } from '@/hooks/useReadingHistory';
import type { ReadingHistoryEntry, BookmarkEntry } from '@/hooks/useReadingHistory';

function mockFetchResponse(data: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve({ success: ok, data }),
  });
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const todayStr = today.toISOString();

const yesterdayDate = new Date(today);
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterdayStr = yesterdayDate.toISOString();

const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
const twoDaysAgoStr = twoDaysAgo.toISOString();

const sampleHistory: ReadingHistoryEntry[] = [
  {
    article_id: 1,
    title: 'Budget Basics',
    summary: 'Learn budgeting',
    category: 'finance',
    cover_emoji: '💰',
    read_time_min: 5,
    xp_earned: 25,
    quiz_score: 80,
    read_at: todayStr,
  },
  {
    article_id: 2,
    title: 'Health Tips',
    summary: 'Stay healthy',
    category: 'health',
    cover_emoji: '🏃',
    read_time_min: 3,
    xp_earned: 15,
    quiz_score: null,
    read_at: yesterdayStr,
  },
  {
    article_id: 3,
    title: 'Productivity Hacks',
    summary: 'Be more productive',
    category: 'productivity',
    cover_emoji: '⏰',
    read_time_min: 7,
    xp_earned: 30,
    quiz_score: 60,
    read_at: twoDaysAgoStr,
  },
];

const sampleBookmarks: BookmarkEntry[] = [
  {
    article_id: 4,
    title: 'Advanced Finance',
    summary: 'Deep dive',
    category: 'finance',
    cover_emoji: '📊',
    read_time_min: 10,
    xp_reward: 40,
    is_read: false,
    bookmarked_at: '2026-01-10T10:00:00Z',
  },
];

describe('useReadingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/progress/')) return mockFetchResponse(sampleHistory);
      if (url.includes('/bookmarks/')) return mockFetchResponse(sampleBookmarks);
      if (url.includes('/bookmark')) return mockFetchResponse({ bookmarked: false });
      return mockFetchResponse({});
    });
  });

  it('loads history and bookmarks on mount', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.history).toHaveLength(3);
    expect(result.current.bookmarks).toHaveLength(1);
  });

  it('starts with loading true', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const { result } = renderHook(() => useReadingHistory(42));
    expect(result.current.loading).toBe(true);
  });

  it('computes stats from history', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.total_articles_read).toBe(3);
    expect(result.current.stats.total_xp_from_content).toBe(70); // 25 + 15 + 30
  });

  it('computes average quiz score from quizzed articles only', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Only articles with quiz_score !== null: 80 and 60 → avg = 70
    expect(result.current.stats.average_quiz_score).toBe(70);
  });

  it('computes categories breakdown', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.categories_breakdown).toEqual({
      finance: 1,
      health: 1,
      productivity: 1,
    });
  });

  it('computes favorite category', async () => {
    // Add more finance entries
    const historyWithMoreFinance = [
      ...sampleHistory,
      { ...sampleHistory[0], article_id: 10, title: 'More Finance', read_at: todayStr },
    ];
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/progress/')) return mockFetchResponse(historyWithMoreFinance);
      if (url.includes('/bookmarks/')) return mockFetchResponse(sampleBookmarks);
      return mockFetchResponse({});
    });

    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.favorite_category).toBe('finance');
  });

  it('computes reading streak from consecutive days', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // We have articles read today, yesterday, and 2 days ago → streak = 3
    expect(result.current.stats.reading_streak).toBe(3);
  });

  it('sets error on fetch failure', async () => {
    mockFetch.mockImplementation(() =>
      Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) }),
    );

    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
  });

  it('defaults tab to history', async () => {
    const { result } = renderHook(() => useReadingHistory(42));
    expect(result.current.tab).toBe('history');
  });

  it('allows changing tab', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    act(() => { result.current.setTab('bookmarks'); });
    expect(result.current.tab).toBe('bookmarks');

    act(() => { result.current.setTab('stats'); });
    expect(result.current.tab).toBe('stats');
  });

  it('removeBookmark removes from local state', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.bookmarks).toHaveLength(1);

    await act(async () => {
      await result.current.removeBookmark(4);
    });

    expect(result.current.bookmarks).toHaveLength(0);
  });

  it('does not load data if userId is undefined', async () => {
    const { result } = renderHook(() => useReadingHistory(undefined));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result.current.history).toEqual([]);
  });

  it('returns empty stats when no history', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/progress/')) return mockFetchResponse([]);
      if (url.includes('/bookmarks/')) return mockFetchResponse([]);
      return mockFetchResponse({});
    });

    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats.total_articles_read).toBe(0);
    expect(result.current.stats.average_quiz_score).toBe(0);
    expect(result.current.stats.favorite_category).toBeNull();
    expect(result.current.stats.reading_streak).toBe(0);
  });

  it('refresh reloads data', async () => {
    const { result } = renderHook(() => useReadingHistory(42));

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callCount = mockFetch.mock.calls.length;

    await act(async () => { await result.current.refresh(); });

    expect(mockFetch.mock.calls.length).toBeGreaterThan(callCount);
  });
});
