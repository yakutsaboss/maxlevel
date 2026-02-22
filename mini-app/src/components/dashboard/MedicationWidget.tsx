import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pill, ChevronRight, Check, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMedicationData } from '@/hooks/useMedicationData.js';
import { useTelegram } from '@/hooks/useTelegram.js';
import type { TodayScheduleItem } from '@/types';

function getNextDue(schedule: TodayScheduleItem[]): TodayScheduleItem | null {
  const pending = schedule.filter((s) => s.status === 'pending');
  if (pending.length === 0) return null;
  return pending.sort((a, b) => a.scheduled_time.localeCompare(b.scheduled_time))[0];
}

function formatTimeUntil(scheduledTime: string): string {
  const now = new Date();
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return 'now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  const remainMins = diffMins % 60;
  return remainMins > 0 ? `${diffHours}h ${remainMins}m` : `${diffHours}h`;
}

export function MedicationWidget() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useTelegram();
  const { todaySchedule, loading } = useMedicationData(user?.id);

  if (loading) {
    return (
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse border border-telegram-hint/10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-telegram-hint/20 rounded-xl" />
          <div className="h-4 bg-telegram-hint/20 rounded w-32" />
        </div>
        <div className="h-3 bg-telegram-hint/10 rounded w-24 mb-2" />
        <div className="h-3 bg-telegram-hint/10 rounded w-40" />
      </div>
    );
  }

  const schedule = todaySchedule ?? [];
  const taken = schedule.filter((s) => s.status === 'taken').length;
  const total = schedule.length;
  const nextDue = getNextDue(schedule);
  const allDone = total > 0 && taken === total;
  const progress = total > 0 ? (taken / total) * 100 : 0;

  return (
    <motion.button
      onClick={() => navigate('/medications')}
      className="w-full bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-left"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      role="link"
      aria-label={t('dashboard.medicationWidget')}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/15 rounded-xl p-1.5">
            <Pill className="w-5 h-5 text-emerald-500" />
          </div>
          <h3 className="text-sm font-semibold text-telegram-text">
            {t('dashboard.medicationWidget')}
          </h3>
        </div>
        <ChevronRight className="w-4 h-4 text-telegram-hint" />
      </div>

      {total === 0 ? (
        <p className="text-xs text-telegram-hint">{t('medication.emptyHint')}</p>
      ) : (
        <>
          {/* Progress bar */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-1 bg-telegram-hint/15 rounded-full h-2 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${allDone ? 'bg-emerald-500' : 'bg-blue-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
            <span className="text-xs font-medium text-telegram-text whitespace-nowrap">
              {t('dashboard.medicationProgress', { taken, total })}
            </span>
          </div>

          {/* Next due or all done */}
          {allDone ? (
            <div className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-500 font-medium">{t('medication.noDue')}</span>
            </div>
          ) : nextDue ? (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-telegram-hint" />
              <span className="text-xs text-telegram-hint">
                {t('dashboard.nextMedication', { name: nextDue.name })} — {formatTimeUntil(nextDue.scheduled_time)}
              </span>
            </div>
          ) : null}
        </>
      )}
    </motion.button>
  );
}
