import { useTranslation } from 'react-i18next';
import { Flame, Star, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

interface AdherenceStatsProps {
  streaks: { current: number; best: number };
  summary: {
    week_rate: number;
    prev_week_rate: number;
    month_rate: number;
    total_taken: number;
    total_scheduled: number;
  };
}

export function AdherenceStats({ streaks, summary }: AdherenceStatsProps) {
  const { t } = useTranslation();
  const weekDiff = summary.week_rate - summary.prev_week_rate;

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Current streak */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="text-xs text-telegram-hint">
            {t('medication.currentStreak', 'Current Streak')}
          </span>
        </div>
        <p className="text-xl font-bold text-telegram-text">
          {streaks.current}
          <span className="text-sm font-normal text-telegram-hint ml-1">
            {t('medication.days', 'days')}
          </span>
        </p>
      </div>

      {/* Best streak */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
        <div className="flex items-center gap-2 mb-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-xs text-telegram-hint">
            {t('medication.bestStreak', 'Best Streak')}
          </span>
        </div>
        <p className="text-xl font-bold text-telegram-text">
          {streaks.best}
          <span className="text-sm font-normal text-telegram-hint ml-1">
            {t('medication.days', 'days')}
          </span>
        </p>
      </div>

      {/* This week */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
        <div className="flex items-center gap-2 mb-1">
          {weekDiff >= 0 ? (
            <TrendingUp className="w-4 h-4 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 text-red-500" />
          )}
          <span className="text-xs text-telegram-hint">
            {t('medication.thisWeek', 'This Week')}
          </span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <p className="text-xl font-bold text-telegram-text">
            {Math.round(summary.week_rate)}%
          </p>
          {weekDiff !== 0 && (
            <span className={`text-xs font-medium ${weekDiff > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {weekDiff > 0 ? '+' : ''}{Math.round(weekDiff)}%
            </span>
          )}
        </div>
      </div>

      {/* Monthly rate */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="text-xs text-telegram-hint">
            {t('medication.monthRate', 'Monthly')}
          </span>
        </div>
        <p className="text-xl font-bold text-telegram-text">
          {Math.round(summary.month_rate)}%
        </p>
      </div>
    </div>
  );
}
