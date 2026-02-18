import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { fetchContentFeed } from '@/api/content';
import type { ContentArticle } from '@/api/content';
import { logger } from '@/utils/logger';

export type ContentCategory = 'all' | 'finance' | 'health' | 'productivity';

interface UseContentFeedReturn {
  articles: ContentArticle[];
  loading: boolean;
  error: string | null;
  category: ContentCategory;
  setCategory: (cat: ContentCategory) => void;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
  refresh: () => Promise<void>;
  articlesReadThisWeek: number;
  totalXp: number;
}

export function useContentFeed(): UseContentFeedReturn {
  const [articles, setArticles] = useState<ContentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategoryRaw] = useState<ContentCategory>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const mountedRef = useRef(true);

  const loadData = useCallback(async (pageNum: number, cat: ContentCategory, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await fetchContentFeed(
        pageNum,
        10,
        cat === 'all' ? undefined : cat,
      );
      if (!mountedRef.current) return;
      if (append) {
        setArticles((prev) => [...prev, ...result.articles]);
      } else {
        setArticles(result.articles);
      }
      setTotalPages(result.totalPages);
      setPage(pageNum);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load articles';
      setError(msg);
      logger.error('useContentFeed loadData error', { error: err });
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadData(1, category, false);
    return () => { mountedRef.current = false; };
  }, [category, loadData]);

  const setCategory = useCallback((cat: ContentCategory) => {
    setCategoryRaw(cat);
    setPage(1);
  }, []);

  const hasMore = useMemo(() => page < totalPages, [page, totalPages]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    await loadData(page + 1, category, true);
  }, [hasMore, loadingMore, page, category, loadData]);

  const refresh = useCallback(async () => {
    await loadData(1, category, false);
  }, [category, loadData]);

  const articlesReadThisWeek = useMemo(
    () => articles.filter((a) => a.is_read).length,
    [articles],
  );

  const totalXp = useMemo(
    () => articles.filter((a) => a.is_read).reduce((sum, a) => sum + a.xp_reward, 0),
    [articles],
  );

  return {
    articles,
    loading,
    error,
    category,
    setCategory,
    hasMore,
    loadMore,
    loadingMore,
    refresh,
    articlesReadThisWeek,
    totalXp,
  };
}
