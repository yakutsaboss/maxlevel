import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3, Loader2, AlertCircle, Zap, Trophy, Target, Flame } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { useAnalytics, type TimeRange } from '@/hooks/useAnalytics';
import { XpTrendChart } from '@/components/analytics/XpTrendChart';
import { ModeBreakdownChart } from '@/components/analytics/ModeBreakdownChart';

const TIME_RANGES: { value: TimeRange; labelKey: string }[] = [
  { value: '7d', labelKey: 'analyticsPage.range7d' },
  { value: '30d', labelKey: 'analyticsPage.range30d' },
  { value: 'all', labelKey: 'analyticsPage.rangeAll' },
];

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  index: number;
}

function StatCard({ icon, label, value, color, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10 text-center"
    >
      <div className={`w-8 h-8 mx-auto mb-2 flex items-center justify-center rounded-xl ${color}`}>
        {icon}
      </div>
      <div className="text-lg font-bold text-telegram-text">{value}</div>
      <div className="text-[10px] text-telegram-hint mt-0.5">{label}</div>
    </motion.div>
  );
}

export function Analytics() {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const { summary, modes, range, changeRange, loading, error, retry } = useAnalytics(user?.id);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-telegram-hint">
        <Loader2 className="w-8 h-8 animate-spin mb-2" />
        <span className="text-sm">{t('analytics.loadingAnalytics')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-telegram-hint">
        <AlertCircle className="w-8 h-8 mb-2 text-red-400" />
        <span className="text-sm text-red-400">{error}</span>
        <button onClick={retry} className="mt-3 text-sm text-telegram-link underline">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-telegram-hint">
        <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
        <span className="text-sm">{t('common.noData')}</span>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 pb-24">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-6 h-6 text-telegram-link" />
        <h1 className="text-xl font-bold text-telegram-text">{t('analyticsPage.title')}</h1>
      </div>

      {/* Time range toggle */}
      <div className="flex gap-2 mb-5" role="tablist" aria-label={t('analyticsPage.timeRange')}>
        {TIME_RANGES.map((tr) => (
          <button
            key={tr.value}
            role="tab"
            aria-selected={range === tr.value}
            onClick={() => changeRange(tr.value)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors ${
              range === tr.value
                ? 'bg-telegram-link text-white'
                : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/10'
            }`}
          >
            {t(tr.labelKey)}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard
          index={0}
          icon={<Zap className="w-4 h-4 text-yellow-400" />}
          label={t('analyticsPage.totalXp')}
          value={summary.total_xp.toLocaleString()}
          color="bg-yellow-500/15"
        />
        <StatCard
          index={1}
          icon={<Trophy className="w-4 h-4 text-purple-400" />}
          label={t('analyticsPage.level')}
          value={summary.level}
          color="bg-purple-500/15"
        />
        <StatCard
          index={2}
          icon={<Target className="w-4 h-4 text-green-400" />}
          label={t('analyticsPage.questsCompleted')}
          value={summary.quests_completed}
          color="bg-green-500/15"
        />
        <StatCard
          index={3}
          icon={<Flame className="w-4 h-4 text-orange-400" />}
          label={t('analyticsPage.longestStreak')}
          value={`${summary.best_streak}d`}
          color="bg-orange-500/15"
        />
      </div>

      {/* Additional stats row */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-telegram-secondaryBg rounded-xl p-2.5 text-center border border-telegram-hint/10">
          <div className="text-sm font-bold text-telegram-text">{summary.active_modes}</div>
          <div className="text-[10px] text-telegram-hint">{t('analyticsPage.activeModes')}</div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-2.5 text-center border border-telegram-hint/10">
          <div className="text-sm font-bold text-telegram-text">{summary.days_active}</div>
          <div className="text-[10px] text-telegram-hint">{t('analyticsPage.daysActive')}</div>
        </div>
        <div className="bg-telegram-secondaryBg rounded-xl p-2.5 text-center border border-telegram-hint/10">
          <div className="text-sm font-bold text-telegram-text">{summary.completion_rate}%</div>
          <div className="text-[10px] text-telegram-hint">{t('analyticsPage.completionRate')}</div>
        </div>
      </div>

      {/* XP Trend Chart */}
      <div className="mb-5">
        <XpTrendChart xpThisWeek={summary.xp_this_week} />
      </div>

      {/* Mode Breakdown Chart */}
      <div className="mb-5">
        <ModeBreakdownChart modes={modes} />
      </div>
    </div>
  );
}
