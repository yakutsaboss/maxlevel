import { useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useMedicationHistory } from '@/hooks/useMedicationQuery.js';
import { MedicationCalendar } from './MedicationCalendar.js';
import { MedicationDayDetail } from './MedicationDayDetail.js';
import type { MedicationDayLog } from './MedicationDayDetail.js';
import { CalendarDays } from 'lucide-react';

export interface MedicationHistoryProps {
  userId: number;
}

export function MedicationHistory({ userId }: MedicationHistoryProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const { data, isLoading } = useMedicationHistory(userId, 60);

  // Transform history data into calendar-friendly format
  const { dailyData, logsByDate } = useMemo(() => {
    const daily: Record<string, { taken: number; total: number; rate: number }> = {};
    const logs: Record<string, MedicationDayLog[]> = {};

    if (!data) return { dailyData: daily, logsByDate: logs };

    // data is MedicationHistoryResponse: { days: MedicationHistoryDay[], overall_adherence }
    const historyData = data as any;

    // Handle both possible API formats:
    // Format A (typed): { days: [{date, logs, adherence_rate}], overall_adherence }
    // Format B (task desc): { history: {"2026-02-24": [...]}, adherence: {taken, total, rate} }
    if (historyData.days && Array.isArray(historyData.days)) {
      for (const day of historyData.days) {
        const dayLogs = day.logs || [];
        const takenCount = dayLogs.filter((l: any) => l.status === 'taken').length;
        const totalCount = dayLogs.length;
        const rate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

        daily[day.date] = { taken: takenCount, total: totalCount, rate };
        logs[day.date] = dayLogs.map((l: any) => ({
          medication_name: l.medication_name || l.name || 'Unknown',
          dosage: l.dosage || '',
          color: l.color || 'blue',
          status: l.status,
          scheduled_time: l.scheduled_time,
          logged_at: l.logged_at || null,
        }));
      }
    } else if (historyData.history && typeof historyData.history === 'object') {
      for (const [dateKey, dayLogs] of Object.entries(historyData.history)) {
        const logArr = dayLogs as any[];
        const takenCount = logArr.filter((l) => l.status === 'taken').length;
        const totalCount = logArr.length;
        const rate = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

        daily[dateKey] = { taken: takenCount, total: totalCount, rate };
        logs[dateKey] = logArr.map((l) => ({
          medication_name: l.medication_name || 'Unknown',
          dosage: l.dosage || '',
          color: l.color || 'blue',
          status: l.status,
          scheduled_time: l.scheduled_time,
          logged_at: l.logged_at || null,
        }));
      }
    }

    return { dailyData: daily, logsByDate: logs };
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading medication history">
        {/* Calendar skeleton */}
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-8 h-8 rounded-full bg-telegram-hint/10" />
            <div className="h-4 w-32 bg-telegram-hint/10 rounded" />
            <div className="w-8 h-8 rounded-full bg-telegram-hint/10" />
          </div>
          <div className="grid grid-cols-7 gap-1 mb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-3 bg-telegram-hint/10 rounded mx-auto w-6" />
            ))}
          </div>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, row) => (
              <div key={row} className="grid grid-cols-7 gap-1">
                {Array.from({ length: 7 }).map((_, col) => (
                  <div key={col} className="aspect-square rounded-xl bg-telegram-hint/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-telegram-hint/15" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  const hasData = Object.keys(dailyData).length > 0;
  if (!hasData) {
    return (
      <div className="text-center py-8 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
        <CalendarDays className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
        <p className="text-sm font-medium text-telegram-text mb-1">No medication history yet</p>
        <p className="text-xs text-telegram-hint">Start tracking your medications to see your history here</p>
      </div>
    );
  }

  const selectedLogs = selectedDate ? (logsByDate[selectedDate] || []) : [];

  return (
    <div className="space-y-4">
      {/* Overall adherence summary */}
      {data && (
        <div className="flex items-center justify-between bg-telegram-secondaryBg rounded-2xl px-4 py-3 border border-telegram-hint/10">
          <span className="text-sm text-telegram-hint">60-day adherence</span>
          <span className={`text-sm font-bold ${
            getAdherenceColor(data)
          }`}>
            {getAdherenceRate(data)}%
          </span>
        </div>
      )}

      {/* Calendar */}
      <MedicationCalendar
        dailyData={dailyData}
        selectedDate={selectedDate}
        onDateSelect={(date) => setSelectedDate(date === selectedDate ? null : date)}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
      />

      {/* Day detail */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <MedicationDayDetail
            key={selectedDate}
            date={selectedDate}
            logs={selectedLogs}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helpers that handle both API response formats
function getAdherenceRate(data: any): number {
  if (typeof data.overall_adherence === 'number') {
    return Math.round(data.overall_adherence);
  }
  if (data.adherence && typeof data.adherence.rate === 'number') {
    return Math.round(data.adherence.rate);
  }
  return 0;
}

function getAdherenceColor(data: any): string {
  const rate = getAdherenceRate(data);
  if (rate >= 80) return 'text-emerald-500';
  if (rate >= 50) return 'text-amber-500';
  return 'text-red-500';
}
