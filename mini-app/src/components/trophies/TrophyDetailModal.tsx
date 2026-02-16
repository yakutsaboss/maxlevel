import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Calendar, Target } from 'lucide-react';
import type { Trophy, UserTrophy } from '@/api/trophies';

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-500',
};

interface TrophyDetailModalProps {
  trophy: Trophy | null;
  earned: UserTrophy | undefined;
  onClose: () => void;
}

export function TrophyDetailModal({ trophy, earned, onClose }: TrophyDetailModalProps) {
  const { t } = useTranslation();
  const isEarned = !!earned;
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trophy) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [trophy]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
  }, [onClose]);

  if (!trophy) return null;

  const gradient = RARITY_GRADIENT[trophy.rarity] ?? RARITY_GRADIENT.common;
  const criteriaType = trophy.criteria?.type as string | undefined;
  const threshold = (trophy.criteria?.threshold as number) ?? 0;

  const earnedDate = earned?.earned_at
    ? new Date(earned.earned_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
        onClick={onClose}
      >
        <motion.div
          ref={sheetRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="bg-telegram-secondaryBg rounded-t-3xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mt-3 mb-2" />

          {/* Close button */}
          <div className="flex justify-end px-4">
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-telegram-hint/10 active:bg-telegram-hint/20"
              aria-label={t('trophy.close')}
            >
              <X className="w-5 h-5 text-telegram-hint" />
            </button>
          </div>

          {/* Trophy icon hero */}
          <div className={`mx-6 mt-2 mb-6 rounded-2xl bg-gradient-to-br ${gradient} p-8 flex items-center justify-center`}>
            <span className={`text-7xl ${!isEarned ? 'grayscale opacity-50' : ''}`} role="img" aria-label={trophy.name}>
              {trophy.icon_emoji}
            </span>
          </div>

          {/* Trophy info */}
          <div className="px-6 pb-8">
            <h2 className="text-xl font-bold mb-1">{trophy.name}</h2>

            {/* Rarity */}
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full capitalize mb-3 bg-gradient-to-r ${gradient} text-white`}>
              {t(`trophy.rarity_${trophy.rarity}`)}
            </span>

            {/* Description */}
            {trophy.description && (
              <p className="text-sm text-telegram-hint mb-4">{trophy.description}</p>
            )}

            {/* Earned date */}
            {isEarned && earnedDate && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-4 py-3 mb-4">
                <Calendar className="w-4 h-4" />
                <span>{t('trophy.earnedOn', { date: earnedDate })}</span>
              </div>
            )}

            {/* Progress hint for unearned trophies */}
            {!isEarned && criteriaType && threshold > 0 && (
              <div className="bg-telegram-bg rounded-xl px-4 py-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-telegram-hint mb-2">
                  <Target className="w-4 h-4" />
                  <span>{t('trophy.howToEarn')}</span>
                </div>
                <p className="text-sm font-medium">
                  {getCriteriaDescription(criteriaType, threshold, t)}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function getCriteriaDescription(
  type: string,
  threshold: number,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  switch (type) {
    case 'quest_count':
      return t('trophy.criteria_quest_count', { count: threshold });
    case 'streak':
      return t('trophy.criteria_streak', { days: threshold });
    case 'level':
    case 'level_reached':
      return t('trophy.criteria_level', { level: threshold });
    case 'total_xp':
      return t('trophy.criteria_xp', { xp: threshold.toLocaleString() });
    case 'friend_count':
      return t('trophy.criteria_friends', { count: threshold });
    case 'achievement_count':
      return t('trophy.criteria_achievements', { count: threshold });
    case 'challenge_create':
      return t('trophy.criteria_challenge_create', { count: threshold });
    case 'challenge_win':
      return t('trophy.criteria_challenge_win', { count: threshold });
    case 'mode_count':
      return t('trophy.criteria_modes', { count: threshold });
    default:
      return t('trophy.criteria_unknown');
  }
}
