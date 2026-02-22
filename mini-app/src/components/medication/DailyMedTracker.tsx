import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, X, Clock } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import type { TodayScheduleItem, MedicationLogStatus } from '@/types';

interface DailyMedTrackerProps {
  schedule: TodayScheduleItem[];
  onLog: (medicationId: number, scheduledTime: string, status: MedicationLogStatus) => void;
  loading?: boolean;
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
};

const STATUS_STYLES: Record<string, string> = {
  taken: 'bg-green-100 border-green-300',
  skipped: 'bg-red-50 border-red-200 opacity-60',
  postponed: 'bg-yellow-50 border-yellow-200',
  pending: 'bg-telegram-secondaryBg border-telegram-hint/10',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function DailyMedTracker({ schedule, onLog, loading }: DailyMedTrackerProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();

  const taken = schedule.filter(s => s.status === 'taken').length;
  const total = schedule.length;
  const progress = total > 0 ? (taken / total) * 100 : 0;

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading schedule">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-center gap-3">
              <div className="skeleton w-5 h-5 rounded-full" />
              <div className="flex-1">
                <div className="skeleton-text h-4 w-24 mb-1">&nbsp;</div>
                <div className="skeleton-text h-3 w-16">&nbsp;</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="text-center py-6 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
        <Clock className="w-10 h-10 text-telegram-hint mx-auto mb-2" aria-hidden="true" />
        <p className="text-telegram-hint text-sm">{t('medication.noDue')}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-medium text-telegram-text">
            {t('medication.progress', { taken, total })}
          </span>
          {progress === 100 && (
            <span className="text-xs text-green-500 font-medium">{t('medication.noDue')}</span>
          )}
        </div>
        <div className="h-2 bg-telegram-hint/20 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Schedule items */}
      <div className="space-y-2">
        {schedule.map((item, index) => (
          <motion.div
            key={`${item.medication_id}-${item.scheduled_time}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-xl border ${STATUS_STYLES[item.status]}`}
          >
            {/* Color dot */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_MAP[item.color] || 'bg-blue-500'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${item.status === 'skipped' ? 'line-through text-telegram-hint' : 'text-telegram-text'}`}>
                  {item.name}
                </span>
                {item.dosage && (
                  <span className="text-xs text-telegram-hint flex-shrink-0">{item.dosage}</span>
                )}
              </div>
              <span className="text-xs text-telegram-hint">{formatTime(item.scheduled_time)}</span>
            </div>

            {/* Actions */}
            {item.status === 'pending' ? (
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { haptic.impact('light'); onLog(item.medication_id, item.scheduled_time, 'taken'); }}
                  className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center active:scale-90 transition-transform"
                  aria-label={`Mark ${item.name} as taken`}
                >
                  <Check className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => { haptic.impact('light'); onLog(item.medication_id, item.scheduled_time, 'skipped'); }}
                  className="w-8 h-8 rounded-full bg-telegram-hint/20 flex items-center justify-center active:scale-90 transition-transform"
                  aria-label={`Mark ${item.name} as skipped`}
                >
                  <X className="w-4 h-4 text-telegram-hint" />
                </button>
              </div>
            ) : (
              <span className={`text-xs font-medium flex-shrink-0 px-2 py-1 rounded-full ${
                item.status === 'taken' ? 'bg-green-500/10 text-green-600' :
                item.status === 'skipped' ? 'bg-red-500/10 text-red-500' :
                'bg-yellow-500/10 text-yellow-600'
              }`}>
                {t(`medication.${item.status}`)}
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
