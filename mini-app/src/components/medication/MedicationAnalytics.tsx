import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { useMedicationAnalytics } from '@/hooks/useMedicationAnalytics';
import { AdherenceStats } from './AdherenceStats';
import { WeeklyAdherenceChart } from './WeeklyAdherenceChart';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { ErrorSection } from '@/components/ErrorSection';

interface MedicationAnalyticsProps {
  userId: number;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
};

function SkeletonCard({ height = 'h-[200px]' }: { height?: string }) {
  return (
    <div className={`bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 ${height}`}>
      <div className="skeleton-text h-4 w-32 mb-3">&nbsp;</div>
      <div className="skeleton w-full h-[calc(100%-28px)] rounded-xl">&nbsp;</div>
    </div>
  );
}

function SkeletonStats() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
          <div className="skeleton-text h-3 w-20 mb-2">&nbsp;</div>
          <div className="skeleton-text h-6 w-16">&nbsp;</div>
        </div>
      ))}
    </div>
  );
}

export function MedicationAnalytics({ userId }: MedicationAnalyticsProps) {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch } = useMedicationAnalytics(userId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonStats />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return <ErrorSection message={t('medication.analyticsError', 'Could not load analytics')} onRetry={() => refetch()} />;
  }

  if (!data || data.daily_adherence.length === 0) {
    return (
      <div className="text-center py-10 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
        <BarChart3 className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
        <p className="text-base font-medium text-telegram-text mb-1">
          {t('medication.noAnalytics', 'No analytics yet')}
        </p>
        <p className="text-sm text-telegram-hint px-6">
          {t('medication.startTracking', 'Start logging your medications to see adherence charts and streaks')}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AdherenceStats streaks={data.streaks} summary={data.summary} />
      <WeeklyAdherenceChart data={data.daily_adherence} />
      <MonthlyTrendChart data={data.daily_adherence} />

      {/* Per-medication breakdown */}
      {data.per_medication.length > 0 && (
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
          <h3 className="text-sm font-semibold text-telegram-text mb-3">
            {t('medication.perMedication', 'Per Medication')}
          </h3>
          <div className="space-y-2.5">
            {data.per_medication.map(med => (
              <div key={med.medication_id} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_MAP[med.color] || 'bg-blue-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-telegram-text truncate">{med.name}</span>
                    <span className="text-xs font-medium text-telegram-hint ml-2">
                      {Math.round(med.rate)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-telegram-hint/15 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.round(med.rate))}%`,
                        backgroundColor: med.rate >= 80 ? '#22c55e' : med.rate >= 50 ? '#eab308' : '#ef4444',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
