import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Bookmark,
  BarChart3,
  Clock,
  Star,
  Zap,
  Flame,
  Trophy,
  TrendingUp,
  BookmarkX,
  CheckCircle,
} from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import {
  useReadingHistory,
  type ReadingTab,
  type ReadingHistoryEntry,
  type BookmarkEntry,
  type ReadingStats,
} from '@/hooks/useReadingHistory';

// --- Helpers ---

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getCategoryColor(category: string): string {
  switch (category.toLowerCase()) {
    case 'finance':
    case 'personal finance':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'health':
      return 'bg-rose-500/15 text-rose-400';
    case 'productivity':
      return 'bg-blue-500/15 text-blue-400';
    default:
      return 'bg-telegram-hint/15 text-telegram-hint';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 50) return 'text-yellow-400';
  return 'text-red-400';
}

// --- Tab buttons ---

const TABS: { key: ReadingTab; label: string; icon: typeof BookOpen }[] = [
  { key: 'history', label: 'History', icon: BookOpen },
  { key: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { key: 'stats', label: 'Stats', icon: BarChart3 },
];

// --- Main component ---

export function ReadingHistory() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();

  const handleBack = useCallback(() => navigate('/content'), [navigate]);
  useBackButton(handleBack);

  const { history, bookmarks, stats, loading, error, tab, setTab, refresh, removeBookmark } =
    useReadingHistory(user?.id);

  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } =
    usePullToRefresh(handleRefresh, haptic);

  const handleTabChange = useCallback((newTab: ReadingTab) => {
    haptic?.impact('light');
    setTab(newTab);
  }, [haptic, setTab]);

  const handleRemoveBookmark = useCallback(async (articleId: number) => {
    haptic?.impact('medium');
    try {
      await removeBookmark(articleId);
    } catch {
      // Error logged in hook
    }
  }, [haptic, removeBookmark]);

  const handleArticleClick = useCallback((articleId: number) => {
    haptic?.impact('light');
    navigate(`/content/${articleId}`);
  }, [haptic, navigate]);

  if (error) {
    return <ErrorSection message={error} onRetry={refresh} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div
        className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 rounded-b-3xl shadow-lg"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-white/90" />
          <h1 className="text-2xl font-bold text-white">Reading History</h1>
        </div>
        <p className="text-violet-100 text-sm mt-1">Track your knowledge journey</p>
      </div>

      {/* Tab bar */}
      <div className="px-4 mt-4">
        <div className="flex bg-telegram-secondaryBg rounded-2xl p-1 border border-telegram-hint/10">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => handleTabChange(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-telegram-hint hover:text-telegram-text'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 mt-4">
        {loading ? (
          <SkeletonLoader />
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {tab === 'history' && (
              <HistoryTab history={history} onArticleClick={handleArticleClick} />
            )}
            {tab === 'bookmarks' && (
              <BookmarksTab
                bookmarks={bookmarks}
                onArticleClick={handleArticleClick}
                onRemove={handleRemoveBookmark}
              />
            )}
            {tab === 'stats' && <StatsTab stats={stats} />}
          </motion.div>
        )}
      </div>
    </div>
  );
}

// --- History Tab ---

function HistoryTab({ history, onArticleClick }: {
  history: ReadingHistoryEntry[];
  onArticleClick: (id: number) => void;
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="w-12 h-12 text-telegram-hint/40" />}
        message="No articles read yet"
        subtext="Start reading to build your history"
      />
    );
  }

  return (
    <div className="space-y-2">
      {history.map((entry, index) => (
        <motion.button
          key={`${entry.article_id}-${entry.read_at}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onArticleClick(entry.article_id)}
          className="w-full bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-left active:scale-[0.98] transition-transform"
        >
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-telegram-bg flex items-center justify-center flex-shrink-0 text-lg">
              {entry.cover_emoji || '📖'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-telegram-text truncate">{entry.title}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getCategoryColor(entry.category)}`}>
                  {entry.category}
                </span>
                <span className="text-[11px] text-telegram-hint flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {entry.read_time_min}m
                </span>
                {entry.xp_earned > 0 && (
                  <span className="text-[11px] text-green-400 font-medium">
                    +{entry.xp_earned} XP
                  </span>
                )}
                {entry.quiz_score !== null && (
                  <span className={`text-[11px] font-medium ${getScoreColor(entry.quiz_score)}`}>
                    Quiz: {entry.quiz_score}%
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-telegram-hint flex-shrink-0 mt-0.5">
              {formatDate(entry.read_at)}
            </span>
          </div>
        </motion.button>
      ))}
    </div>
  );
}

// --- Bookmarks Tab ---

function BookmarksTab({ bookmarks, onArticleClick, onRemove }: {
  bookmarks: BookmarkEntry[];
  onArticleClick: (id: number) => void;
  onRemove: (id: number) => void;
}) {
  if (bookmarks.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="w-12 h-12 text-telegram-hint/40" />}
        message="No bookmarks yet"
        subtext="Save articles to read later"
      />
    );
  }

  return (
    <div className="space-y-2">
      {bookmarks.map((entry, index) => (
        <motion.div
          key={entry.article_id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex gap-3">
            <button
              onClick={() => onArticleClick(entry.article_id)}
              className="w-10 h-10 rounded-xl bg-telegram-bg flex items-center justify-center flex-shrink-0 text-lg active:scale-95 transition-transform"
            >
              {entry.cover_emoji || '📖'}
            </button>
            <button
              onClick={() => onArticleClick(entry.article_id)}
              className="flex-1 min-w-0 text-left"
            >
              <p className="text-sm font-medium text-telegram-text truncate">{entry.title}</p>
              <p className="text-[11px] text-telegram-hint mt-0.5 line-clamp-1">{entry.summary}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${getCategoryColor(entry.category)}`}>
                  {entry.category}
                </span>
                <span className="text-[11px] text-telegram-hint flex items-center gap-0.5">
                  <Clock className="w-3 h-3" />
                  {entry.read_time_min}m read
                </span>
                <span className="text-[11px] text-violet-400 font-medium">
                  +{entry.xp_reward} XP
                </span>
                {entry.is_read && (
                  <CheckCircle className="w-3.5 h-3.5 text-green-400" />
                )}
              </div>
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemove(entry.article_id); }}
              className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform self-center"
              aria-label="Remove bookmark"
            >
              <BookmarkX className="w-4 h-4 text-red-400" />
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// --- Stats Tab ---

function StatsTab({ stats }: { stats: ReadingStats }) {
  const categoryEntries = Object.entries(stats.categories_breakdown).sort((a, b) => b[1] - a[1]);
  const maxCategoryCount = categoryEntries[0]?.[1] ?? 1;

  return (
    <div className="space-y-4">
      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<BookOpen className="w-5 h-5 text-violet-400" />}
          label="Articles Read"
          value={String(stats.total_articles_read)}
          bg="bg-violet-500/10"
        />
        <StatCard
          icon={<Star className="w-5 h-5 text-yellow-400" />}
          label="Avg Quiz Score"
          value={stats.average_quiz_score > 0 ? `${stats.average_quiz_score}%` : '—'}
          bg="bg-yellow-500/10"
        />
        <StatCard
          icon={<Zap className="w-5 h-5 text-green-400" />}
          label="XP from Content"
          value={stats.total_xp_from_content.toLocaleString()}
          bg="bg-green-500/10"
        />
        <StatCard
          icon={<Flame className="w-5 h-5 text-orange-400" />}
          label="Reading Streak"
          value={stats.reading_streak > 0 ? `${stats.reading_streak}d` : '—'}
          bg="bg-orange-500/10"
        />
      </div>

      {/* Favorite category */}
      {stats.favorite_category && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-telegram-text">Favorite Category</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${getCategoryColor(stats.favorite_category)}`}>
              {stats.favorite_category}
            </span>
            <span className="text-xs text-telegram-hint">
              {stats.categories_breakdown[stats.favorite_category]} articles
            </span>
          </div>
        </motion.div>
      )}

      {/* Category breakdown */}
      {categoryEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-telegram-link" />
            <span className="text-sm font-semibold text-telegram-text">Categories</span>
          </div>
          <div className="space-y-3">
            {categoryEntries.map(([cat, count]) => (
              <div key={cat}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-telegram-text">{cat}</span>
                  <span className="text-xs text-telegram-hint">{count} articles</span>
                </div>
                <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(count / maxCategoryCount) * 100}%` }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="h-full bg-violet-500 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Empty state for stats */}
      {stats.total_articles_read === 0 && (
        <EmptyState
          icon={<BarChart3 className="w-12 h-12 text-telegram-hint/40" />}
          message="No stats yet"
          subtext="Read articles and take quizzes to see your stats"
        />
      )}
    </div>
  );
}

// --- Shared sub-components ---

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bg: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-2`}>
        {icon}
      </div>
      <div className="text-xl font-bold text-telegram-text">{value}</div>
      <div className="text-[11px] text-telegram-hint mt-0.5">{label}</div>
    </motion.div>
  );
}

function EmptyState({ icon, message, subtext }: {
  icon: React.ReactNode;
  message: string;
  subtext: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="mx-auto mb-4">{icon}</div>
      <p className="text-telegram-hint text-sm font-medium">{message}</p>
      <p className="text-telegram-hint/60 text-xs mt-1">{subtext}</p>
    </motion.div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 bg-telegram-hint/20 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-telegram-hint/20 rounded w-3/4" />
              <div className="h-2.5 bg-telegram-hint/10 rounded w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
