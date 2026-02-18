import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { ErrorSection } from '@/components/ErrorSection';
import { Toast } from '@/components/Toast';
import {
  Bookmark,
  BookmarkCheck,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  ArrowUp,
} from 'lucide-react';

// --- Types ---

interface Article {
  id: number;
  title: string;
  summary: string;
  body_html: string;
  category: string;
  read_time_min: number;
  xp_reward: number;
  cover_emoji: string;
  difficulty: string;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

interface RelatedArticle {
  id: number;
  title: string;
  cover_emoji: string;
  category: string;
  read_time_min: number;
  xp_reward: number;
}

// --- API helpers (standalone fetch, same pattern as activities.ts) ---

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

async function fetchArticle(articleId: number): Promise<Article> {
  const res = await fetch(`${API_BASE_URL}/content/${articleId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to load article (${res.status})`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to load article');
  return json.data;
}

async function fetchRelatedArticles(articleId: number): Promise<RelatedArticle[]> {
  const res = await fetch(`${API_BASE_URL}/content/${articleId}/related`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.success ? json.data : [];
}

async function markArticleRead(articleId: number, userId: number): Promise<{ xp_earned: number }> {
  const res = await fetch(`${API_BASE_URL}/content/${articleId}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Failed to mark read (${res.status})`);
  const json = await res.json();
  return json.data ?? { xp_earned: 0 };
}

async function toggleBookmarkApi(articleId: number, userId: number): Promise<{ bookmarked: boolean }> {
  const res = await fetch(`${API_BASE_URL}/content/${articleId}/bookmark`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error(`Bookmark failed (${res.status})`);
  const json = await res.json();
  return json.data ?? { bookmarked: false };
}

async function checkBookmark(articleId: number, userId: number): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/content/bookmarks/${userId}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) return false;
  const json = await res.json();
  if (!json.success || !Array.isArray(json.data)) return false;
  return json.data.some((b: { article_id: number }) => b.article_id === articleId);
}

// --- Skeleton ---

function ArticleReaderSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading article">
      <div className="bg-gradient-to-br from-blue-500 to-indigo-600 pt-10 pb-8 px-6 rounded-b-3xl">
        <div className="animate-pulse">
          <div className="bg-white/20 w-16 h-16 rounded-2xl mb-4" />
          <div className="bg-white/20 w-3/4 h-7 rounded-lg mb-3" />
          <div className="bg-white/20 w-1/2 h-5 rounded-lg mb-4" />
          <div className="flex gap-3">
            <div className="bg-white/20 w-20 h-6 rounded-full" />
            <div className="bg-white/20 w-24 h-6 rounded-full" />
          </div>
        </div>
      </div>
      <div className="px-5 mt-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-telegram-hint/20 w-full h-4 rounded mb-2" />
            <div className="bg-telegram-hint/20 w-5/6 h-4 rounded mb-2" />
            <div className="bg-telegram-hint/20 w-2/3 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Category color map ---

const CATEGORY_COLORS: Record<string, { from: string; to: string; badge: string }> = {
  finance: { from: 'from-emerald-500', to: 'to-teal-600', badge: 'bg-emerald-400/20 text-emerald-100' },
  health: { from: 'from-rose-500', to: 'to-pink-600', badge: 'bg-rose-400/20 text-rose-100' },
  productivity: { from: 'from-blue-500', to: 'to-indigo-600', badge: 'bg-blue-400/20 text-blue-100' },
};

function getCategoryColors(category: string) {
  return CATEGORY_COLORS[category.toLowerCase()] ?? {
    from: 'from-violet-500',
    to: 'to-purple-600',
    badge: 'bg-violet-400/20 text-violet-100',
  };
}

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

// --- Main Component ---

export function ArticleReader() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const { user, haptic } = useTelegram();

  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<RelatedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [readCompleted, setReadCompleted] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error' | 'info'>('success');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const readThresholdReachedRef = useRef(false);

  const parsedId = articleId ? parseInt(articleId, 10) : NaN;

  // Back button
  useBackButton(useCallback(() => navigate(-1), [navigate]));

  // Load article + bookmark status + related articles
  useEffect(() => {
    if (isNaN(parsedId)) {
      setError('Invalid article ID');
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [art, rel] = await Promise.all([
          fetchArticle(parsedId),
          fetchRelatedArticles(parsedId),
        ]);
        if (cancelled) return;
        setArticle(art);
        setRelated(rel);

        // Check bookmark status
        if (user?.id) {
          const isBookmarked = await checkBookmark(parsedId, user.id);
          if (!cancelled) setBookmarked(isBookmarked);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load article');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [parsedId, user?.id]);

  // Scroll progress tracking
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !article) return;

    function handleScroll() {
      const el = container!;
      const scrollTop = el.scrollTop;
      const scrollHeight = el.scrollHeight - el.clientHeight;

      if (scrollHeight <= 0) {
        setScrollProgress(100);
        return;
      }

      const progress = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
      setScrollProgress(progress);
      setShowScrollTop(scrollTop > 400);
    }

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [article]);

  // Award XP at 80% read
  useEffect(() => {
    if (
      scrollProgress >= 80 &&
      !readThresholdReachedRef.current &&
      !readCompleted &&
      article &&
      user?.id
    ) {
      readThresholdReachedRef.current = true;
      setReadCompleted(true);

      markArticleRead(parsedId, user.id)
        .then((result) => {
          if (result.xp_earned > 0) {
            setXpAwarded(true);
            setToastVariant('success');
            setToastMessage(`+${result.xp_earned} XP earned for reading!`);
            haptic.notification('success');
          }
        })
        .catch(() => {
          // Silent fail — don't interrupt reading
        });
    }
  }, [scrollProgress, readCompleted, article, user?.id, parsedId, haptic]);

  // Bookmark toggle
  const handleBookmark = async () => {
    if (!user?.id || bookmarkLoading) return;
    setBookmarkLoading(true);
    haptic.impact('light');

    try {
      const result = await toggleBookmarkApi(parsedId, user.id);
      setBookmarked(result.bookmarked);
      setToastVariant('info');
      setToastMessage(result.bookmarked ? 'Bookmarked!' : 'Bookmark removed');
    } catch {
      setToastVariant('error');
      setToastMessage('Failed to update bookmark');
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleTakeQuiz = () => {
    haptic.impact('medium');
    navigate(`/content/${parsedId}/quiz`);
  };

  const handleReadRelated = (relId: number) => {
    haptic.impact('light');
    navigate(`/content/${relId}`);
  };

  const scrollToTop = () => {
    haptic.impact('light');
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Retry handler
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    fetchArticle(parsedId)
      .then((art) => {
        setArticle(art);
        return fetchRelatedArticles(parsedId);
      })
      .then((rel) => setRelated(rel))
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setLoading(false));
  };

  if (loading) return <ArticleReaderSkeleton />;
  if (error || !article) {
    return <ErrorSection message={error || 'Article not found'} onRetry={handleRetry} />;
  }

  const colors = getCategoryColors(article.category);

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-screen h-screen bg-telegram-bg text-telegram-text overflow-y-auto"
    >
      {/* Scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-telegram-hint/10">
        <motion.div
          className={`h-full bg-gradient-to-r ${colors.from} ${colors.to}`}
          style={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Header with cover */}
      <div className={`bg-gradient-to-br ${colors.from} ${colors.to} pt-10 pb-8 px-6 rounded-b-3xl shadow-lg safe-area-top`}>
        {/* Cover emoji */}
        <div className="text-5xl mb-4" role="img" aria-label={article.category}>
          {article.cover_emoji}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white leading-tight mb-3">
          {article.title}
        </h1>

        {/* Summary */}
        <p className="text-white/80 text-sm leading-relaxed mb-4">
          {article.summary}
        </p>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
            {article.category}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white/90">
            <Clock className="w-3 h-3" aria-hidden="true" />
            {article.read_time_min} min
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white/90">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            +{article.xp_reward} XP
          </span>
          {article.difficulty && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/15 text-white/90">
              {DIFFICULTY_LABELS[article.difficulty] ?? article.difficulty}
            </span>
          )}
        </div>

        {/* Bookmark button */}
        <button
          onClick={handleBookmark}
          disabled={bookmarkLoading}
          className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 active:scale-95 transition-all px-4 py-2 rounded-xl text-white text-sm font-medium"
          aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark article'}
        >
          {bookmarked ? (
            <BookmarkCheck className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Bookmark className="w-4 h-4" aria-hidden="true" />
          )}
          {bookmarked ? 'Bookmarked' : 'Bookmark'}
        </button>
      </div>

      {/* XP awarded banner */}
      <AnimatePresence>
        {xpAwarded && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-5 mt-4 bg-gradient-to-r from-amber-400 to-orange-400 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-md"
          >
            <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
            <span className="text-white text-sm font-semibold">
              +{article.xp_reward} XP earned for reading this article!
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Article body */}
      <div className="px-5 mt-6 pb-6" ref={contentRef}>
        <div
          className="article-body prose prose-sm max-w-none
            text-telegram-text
            prose-headings:text-telegram-text prose-headings:font-bold
            prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3
            prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2
            prose-p:text-sm prose-p:leading-relaxed prose-p:mb-4 prose-p:text-telegram-text/90
            prose-strong:text-telegram-text prose-strong:font-semibold
            prose-ul:my-3 prose-ul:pl-5 prose-li:text-sm prose-li:mb-1 prose-li:text-telegram-text/90
            prose-ol:my-3 prose-ol:pl-5
            prose-a:text-telegram-link prose-a:underline prose-a:underline-offset-2
            prose-blockquote:border-l-4 prose-blockquote:border-telegram-link/30 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-telegram-hint
            prose-code:bg-telegram-secondaryBg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
            prose-img:rounded-xl prose-img:my-4"
          dangerouslySetInnerHTML={{ __html: article.body_html }}
        />

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-telegram-hint/10">
            {article.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-telegram-secondaryBg text-telegram-hint text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Read progress indicator */}
        <div className="mt-6 bg-telegram-secondaryBg rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-telegram-hint">Reading Progress</span>
            <span className="text-xs font-bold text-telegram-text">{scrollProgress}%</span>
          </div>
          <div className="h-2 bg-telegram-hint/10 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${colors.from} ${colors.to}`}
              style={{ width: `${scrollProgress}%` }}
              transition={{ duration: 0.15 }}
            />
          </div>
          {scrollProgress < 80 && (
            <p className="text-xs text-telegram-hint mt-2">
              Read to 80% to earn +{article.xp_reward} XP
            </p>
          )}
          {readCompleted && (
            <p className="text-xs text-emerald-500 font-medium mt-2">
              Reading complete — XP awarded!
            </p>
          )}
        </div>

        {/* Take Quiz CTA */}
        <motion.button
          onClick={handleTakeQuiz}
          whileTap={{ scale: 0.97 }}
          className={`w-full mt-5 bg-gradient-to-r ${colors.from} ${colors.to} text-white font-semibold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg`}
        >
          <BookOpen className="w-5 h-5" aria-hidden="true" />
          Take Quiz — Earn More XP
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </motion.button>

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-bold text-telegram-text mb-4">Related Articles</h2>
            <div className="space-y-3">
              {related.map((rel) => {
                const relColors = getCategoryColors(rel.category);
                return (
                  <motion.button
                    key={rel.id}
                    onClick={() => handleReadRelated(rel.id)}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-telegram-secondaryBg rounded-2xl p-4 flex items-center gap-4 text-left active:bg-telegram-hint/10 transition-colors"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${relColors.from} ${relColors.to} flex items-center justify-center text-2xl flex-shrink-0`}>
                      {rel.cover_emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-telegram-text truncate">
                        {rel.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-telegram-hint">{rel.category}</span>
                        <span className="text-telegram-hint/30">·</span>
                        <span className="text-xs text-telegram-hint">{rel.read_time_min} min</span>
                        <span className="text-telegram-hint/30">·</span>
                        <span className="text-xs text-telegram-link">+{rel.xp_reward} XP</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-telegram-hint flex-shrink-0" aria-hidden="true" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom padding for navigation */}
        <div className="h-20" />
      </div>

      {/* Scroll to top FAB */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-24 right-4 z-40 w-10 h-10 bg-telegram-secondaryBg border border-telegram-hint/10 rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Scroll to top"
          >
            <ArrowUp className="w-5 h-5 text-telegram-text" aria-hidden="true" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Toast notifications */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          onDismiss={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
