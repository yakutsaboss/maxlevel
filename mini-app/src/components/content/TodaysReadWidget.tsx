import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ChevronRight, Zap } from 'lucide-react';
import { apiClient } from '@/api/client';

interface RecommendedArticle {
  id: number;
  title: string;
  summary: string;
  category: string;
  read_time_min: number;
  xp_reward: number;
  cover_emoji: string;
  difficulty: string;
}

interface DailyTip {
  emoji: string;
  text: string;
  category: string;
  article_id: number | null;
}

interface RecommendationsData {
  articles: RecommendedArticle[];
  dailyTip: DailyTip;
}

interface TodaysReadWidgetProps {
  userId: number;
  onArticleClick?: (articleId: number) => void;
}

export const TodaysReadWidget = memo(function TodaysReadWidget({ userId, onArticleClick }: TodaysReadWidgetProps) {
  const [data, setData] = useState<RecommendationsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || userId <= 0) return;

    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      try {
        const resp = await apiClient.getRecommendations(userId, 1, { signal: controller.signal });
        if (!cancelled && resp.success && resp.data) {
          setData(resp.data);
        }
      } catch {
        // Silently fail — widget is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 animate-pulse">
        <div className="h-4 bg-telegram-hint/20 rounded w-24 mb-3" />
        <div className="h-3 bg-telegram-hint/20 rounded w-full mb-2" />
        <div className="h-3 bg-telegram-hint/20 rounded w-3/4" />
      </div>
    );
  }

  if (!data) return null;

  const article = data.articles[0];
  const tip = data.dailyTip;

  return (
    <div className="space-y-3">
      {/* Daily Tip */}
      {tip && (
        <motion.div
          className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl p-4 border border-indigo-500/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0" aria-hidden="true">{tip.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-indigo-400 mb-1">Daily Tip</p>
              <p className="text-sm text-telegram-text leading-relaxed">{tip.text}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommended Article Card */}
      {article && (
        <motion.button
          type="button"
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 w-full text-left"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          onClick={() => onArticleClick?.(article.id)}
          aria-label={`Read article: ${article.title}, ${article.read_time_min} min, ${article.xp_reward} XP`}
        >
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-telegram-link" aria-hidden="true" />
            <span className="text-xs font-medium text-telegram-link">Today's Read</span>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0" aria-hidden="true">{article.cover_emoji}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-telegram-text text-sm truncate">{article.title}</h3>
              <p className="text-xs text-telegram-hint mt-1 line-clamp-2">{article.summary}</p>

              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs text-telegram-hint">{article.read_time_min} min read</span>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" aria-hidden="true" />
                  <span className="text-xs font-semibold text-yellow-600">{article.xp_reward} XP</span>
                </div>
                <span className="text-xs text-telegram-hint bg-telegram-hint/10 rounded-full px-2 py-0.5">{article.category}</span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-telegram-hint flex-shrink-0 mt-1" aria-hidden="true" />
          </div>
        </motion.button>
      )}
    </div>
  );
});
