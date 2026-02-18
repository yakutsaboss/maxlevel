import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ContentArticle } from '@/api/content';

const CATEGORY_COLORS: Record<string, string> = {
  finance: 'bg-emerald-500/20 text-emerald-400',
  health: 'bg-red-500/20 text-red-400',
  productivity: 'bg-blue-500/20 text-blue-400',
};

interface ContentCardProps {
  article: ContentArticle;
  index: number;
  onClick: (articleId: number) => void;
}

export const ContentCard = memo(function ContentCard({
  article,
  index,
  onClick,
}: ContentCardProps) {
  const { t } = useTranslation();
  const categoryColor = CATEGORY_COLORS[article.category] || 'bg-gray-500/20 text-gray-400';

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      onClick={() => onClick(article.id)}
      className={`w-full bg-telegram-secondaryBg rounded-2xl p-4 border text-left transition-all active:scale-[0.98] ${
        article.is_read
          ? 'border-telegram-hint/10 opacity-80'
          : 'border-l-4 border-l-telegram-link border-telegram-hint/10'
      }`}
      aria-label={`${article.title} - ${article.category} - ${article.read_time_min} ${t('content.readTime')}`}
    >
      <div className="flex gap-3">
        {/* Cover emoji */}
        <div
          className="text-3xl w-12 h-12 flex items-center justify-center bg-telegram-bg rounded-xl flex-shrink-0"
          role="img"
          aria-hidden="true"
        >
          {article.cover_emoji || '📄'}
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-telegram-text text-sm leading-snug line-clamp-2">
              {article.title}
            </h3>
            {!article.is_read && (
              <span className="bg-telegram-link text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
                {t('content.new')}
              </span>
            )}
          </div>

          <p className="text-telegram-hint text-xs line-clamp-2 mb-2">
            {article.summary}
          </p>

          {/* Bottom row: category + read time + XP */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${categoryColor} text-[10px] px-1.5 py-0.5 rounded-full font-medium`}>
              {t(`content.categories.${article.category}`)}
            </span>
            <div className="flex items-center gap-1 text-telegram-hint text-[11px]">
              <Clock className="w-3 h-3" aria-hidden="true" />
              <span>{article.read_time_min} {t('content.readTime')}</span>
            </div>
            <div className="flex items-center gap-1 text-telegram-link text-[11px] font-medium">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              <span>+{article.xp_reward} XP</span>
            </div>
          </div>
        </div>
      </div>
    </motion.button>
  );
});
