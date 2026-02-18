import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useContentFeed } from '@/hooks/useContentFeed';
import type { ContentCategory } from '@/hooks/useContentFeed';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { ContentCard } from '@/components/content/ContentCard';
import { BookOpen, Sparkles } from 'lucide-react';

const CATEGORIES: ContentCategory[] = ['all', 'finance', 'health', 'productivity'];

function ContentFeedSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading articles">
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl">
        <div className="animate-pulse">
          <div className="bg-white/20 w-36 h-7 rounded-lg mb-4" />
          <div className="bg-white/10 rounded-2xl px-4 py-3 flex gap-4">
            <div className="bg-white/20 w-20 h-10 rounded-lg" />
            <div className="bg-white/20 w-20 h-10 rounded-lg" />
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/20 w-20 h-8 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 h-28 animate-pulse">
            <div className="flex gap-3">
              <div className="bg-telegram-hint/20 w-12 h-12 rounded-xl flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="bg-telegram-hint/20 w-3/4 h-4 rounded" />
                <div className="bg-telegram-hint/20 w-full h-3 rounded" />
                <div className="bg-telegram-hint/20 w-1/2 h-3 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentFeed() {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const navigate = useNavigate();

  const {
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
  } = useContentFeed();

  useBackButton(useCallback(() => navigate('/'), [navigate]));

  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleCardClick = useCallback((articleId: number) => {
    haptic.impact('light');
    navigate(`/content/${articleId}`);
  }, [haptic, navigate]);

  if (loading) return <ContentFeedSkeleton />;

  if (error) return <ErrorSection message={error} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <BookOpen className="w-7 h-7 text-white" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white">{t('content.title')}</h1>
        </div>

        {/* Stats row */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex gap-4">
          <div className="flex-1">
            <p className="text-white/70 text-xs font-medium">{t('content.articlesRead')}</p>
            <p className="text-white text-xl font-bold">{articlesReadThisWeek}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" aria-hidden="true" />
              <p className="text-white/70 text-xs font-medium">{t('content.totalXp')}</p>
            </div>
            <p className="text-white text-xl font-bold">{totalXp}</p>
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Content categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              onClick={() => { haptic.impact('light'); setCategory(cat); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                category === cat
                  ? 'bg-white text-indigo-700'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {t(`content.categories.${cat}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Article list */}
      <div className="px-4 mt-4 space-y-3 mb-6">
        {articles.map((article, index) => (
          <ContentCard
            key={article.id}
            article={article}
            index={index}
            onClick={handleCardClick}
          />
        ))}

        {/* Empty state */}
        {articles.length === 0 && (
          <div className="text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <BookOpen className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
            <p className="text-telegram-hint">{t('content.noArticles')}</p>
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 bg-telegram-secondaryBg text-telegram-link text-sm font-medium rounded-2xl border border-telegram-hint/10 active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loadingMore ? '...' : t('content.loadMore')}
          </button>
        )}
      </div>
    </div>
  );
}
