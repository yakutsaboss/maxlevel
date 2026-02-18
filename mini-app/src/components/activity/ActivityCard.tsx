import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ActivityWithStats } from '@/hooks/useActivities';

const CATEGORY_COLORS: Record<string, string> = {
  cardio: 'bg-red-500/20 text-red-400',
  strength: 'bg-orange-500/20 text-orange-400',
  flexibility: 'bg-teal-500/20 text-teal-400',
  sports: 'bg-blue-500/20 text-blue-400',
  outdoor: 'bg-green-500/20 text-green-400',
  'mind-body': 'bg-purple-500/20 text-purple-400',
};

function formatLastDone(lastDone: string | null, t: (key: string) => string): string {
  if (!lastDone) return t('activityHub.never');
  const now = new Date();
  const done = new Date(lastDone);
  const diffMs = now.getTime() - done.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return t('activityHub.lastDone') + ': today';
  if (diffDays === 1) return t('activityHub.lastDone') + ': 1d ago';
  return `${t('activityHub.lastDone')}: ${diffDays}d ago`;
}

function formatRecord(
  duration: number | null,
  calories: number | null,
  t: (key: string) => string,
): string | null {
  if (duration) return `${duration} ${t('activityHub.minutes')}`;
  if (calories) return `${calories} ${t('activityHub.calories')}`;
  return null;
}

interface ActivityCardProps {
  activity: ActivityWithStats;
  index: number;
  onQuickLog: (activityTypeId: number) => void;
  onStartTimer: (activityTypeId: number) => void;
  logging: number | null;
  haptic: { impact: (style?: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void };
}

export const ActivityCard = memo(function ActivityCard({
  activity,
  index,
  onQuickLog,
  onStartTimer,
  logging,
  haptic,
}: ActivityCardProps) {
  const { t } = useTranslation();
  const isLogging = logging === activity.id;
  const categoryColor = CATEGORY_COLORS[activity.category] || 'bg-gray-500/20 text-gray-400';
  const record = formatRecord(activity.personal_record_duration, activity.personal_record_calories, t);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10 flex flex-col"
    >
      {/* Top: icon + name + category */}
      <div className="flex items-start gap-2.5 mb-2">
        <div
          className="text-2xl w-10 h-10 flex items-center justify-center bg-telegram-bg rounded-xl flex-shrink-0"
          role="img"
          aria-label={activity.name}
        >
          {activity.icon_emoji || '🏃'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-telegram-text text-sm truncate">{activity.name}</p>
          <span className={`${categoryColor} text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-0.5`}>
            {activity.category}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-[11px] text-telegram-hint space-y-0.5 mb-3">
        <p>{formatLastDone(activity.last_done, t)}</p>
        {record && (
          <p className="text-telegram-link font-medium">
            {t('activityHub.personalRecord')}: {record}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => { haptic.impact('light'); onQuickLog(activity.id); }}
          disabled={isLogging}
          className="flex-1 flex items-center justify-center gap-1 bg-telegram-button text-white text-xs font-medium py-2 rounded-xl active:scale-[0.97] transition-transform disabled:opacity-50"
          aria-label={`${t('activityHub.quickLog')} ${activity.name}`}
        >
          <Zap className="w-3.5 h-3.5" aria-hidden="true" />
          {isLogging ? '...' : t('activityHub.quickLog')}
        </button>
        <button
          onClick={() => { haptic.impact('light'); onStartTimer(activity.id); }}
          className="flex-1 flex items-center justify-center gap-1 bg-telegram-bg text-telegram-link text-xs font-medium py-2 rounded-xl border border-telegram-link/30 active:scale-[0.97] transition-transform"
          aria-label={`${t('activityHub.startTimer')} ${activity.name}`}
        >
          <Timer className="w-3.5 h-3.5" aria-hidden="true" />
          {t('activityHub.startTimer')}
        </button>
      </div>
    </motion.div>
  );
});
