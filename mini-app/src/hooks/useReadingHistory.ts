import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { logger } from '@/utils/logger';

// --- Types ---

export interface ReadingHistoryEntry {
  article_id: number;
  title: string;
  summary: string;
  category: string;
  cover_emoji: string;
  read_time_min: number;
  xp_earned: number;
  quiz_score: number | null;
  read_at: string;
}

export interface BookmarkEntry {
  article_id: number;
  title: string;
  summary: string;
  category: string;
  cover_emoji: string;
  read_time_min: number;
  xp_reward: number;
  is_read: boolean;
  bookmarked_at: string;
}

export interface ReadingStats {
  total_articles_read: number;
  average_quiz_score: number;
  total_xp_from_content: number;
  reading_streak: number;
  favorite_category: string | null;
  categories_breakdown: Record<string, number>;
}

export type ReadingTab = 'history' | 'bookmarks' | 'stats';

interface UseReadingHistoryReturn {
  history: ReadingHistoryEntry[];
  bookmarks: BookmarkEntry[];
  stats: ReadingStats;
  loading: boolean;
  error: string | null;
  tab: ReadingTab;
  setTab: (tab: ReadingTab) => void;
  refresh: () => Promise<void>;
  removeBookmark: (articleId: number) => Promise<void>;
}

// --- API helpers ---

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const initData = window.Telegram?.WebApp?.initData;
  if (initData) headers['X-Telegram-Init-Data'] = initData;
  return headers;
}

async function fetchProgress(userId: number, signal?: AbortSignal): Promise<ReadingHistoryEntry[]> {
  const res = await fetch(`${API_BASE_URL}/content/progress/${userId}`, { headers: getHeaders(), signal });
  if (!res.ok) throw new Error(`Progress request failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function fetchBookmarks(userId: number, signal?: AbortSignal): Promise<BookmarkEntry[]> {
  const res = await fetch(`${API_BASE_URL}/content/bookmarks/${userId}`, { headers: getHeaders(), signal });
  if (!res.ok) throw new Error(`Bookmarks request failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

async function toggleBookmark(articleId: number, signal?: AbortSignal): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/content/${articleId}/bookmark`, {
    method: 'POST',
    headers: getHeaders(),
    signal,
  });
  if (!res.ok) throw new Error(`Bookmark toggle failed: ${res.status}`);
}

// --- Stats computation ---

function computeStats(history: ReadingHistoryEntry[]): ReadingStats {
  if (history.length === 0) {
    return {
      total_articles_read: 0,
      average_quiz_score: 0,
      total_xp_from_content: 0,
      reading_streak: 0,
      favorite_category: null,
      categories_breakdown: {},
    };
  }

  const totalXp = history.reduce((sum, h) => sum + (h.xp_earned || 0), 0);

  const quizScores = history.filter((h) => h.quiz_score !== null).map((h) => h.quiz_score!);
  const avgQuiz = quizScores.length > 0
    ? Math.round(quizScores.reduce((s, v) => s + v, 0) / quizScores.length)
    : 0;

  // Category breakdown
  const catCount: Record<string, number> = {};
  for (const h of history) {
    catCount[h.category] = (catCount[h.category] || 0) + 1;
  }
  const favorite = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Reading streak: count consecutive days from today going backwards
  const sortedDates = [...new Set(
    history.map((h) => new Date(h.read_at).toISOString().slice(0, 10))
  )].sort().reverse();

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < sortedDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedStr = expected.toISOString().slice(0, 10);
    if (sortedDates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return {
    total_articles_read: history.length,
    average_quiz_score: avgQuiz,
    total_xp_from_content: totalXp,
    reading_streak: streak,
    favorite_category: favorite,
    categories_breakdown: catCount,
  };
}

// --- Hook ---

export function useReadingHistory(userId: number | undefined): UseReadingHistoryReturn {
  const [history, setHistory] = useState<ReadingHistoryEntry[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<ReadingTab>('history');
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [progressData, bookmarkData] = await Promise.all([
        fetchProgress(userId),
        fetchBookmarks(userId),
      ]);
      if (!mountedRef.current) return;
      setHistory(progressData);
      setBookmarks(bookmarkData);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load reading history';
      setError(msg);
      logger.error('useReadingHistory loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const stats = useMemo(() => computeStats(history), [history]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const removeBookmark = useCallback(async (articleId: number) => {
    try {
      await toggleBookmark(articleId);
      if (!mountedRef.current) return;
      setBookmarks((prev) => prev.filter((b) => b.article_id !== articleId));
    } catch (err) {
      logger.error('useReadingHistory removeBookmark error', { error: err });
      throw err;
    }
  }, []);

  return { history, bookmarks, stats, loading, error, tab, setTab, refresh, removeBookmark };
}
