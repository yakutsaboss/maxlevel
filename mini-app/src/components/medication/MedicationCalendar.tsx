import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface MedicationCalendarProps {
  dailyData: Record<string, { taken: number; total: number; rate: number }>;
  selectedDate: string | null;
  onDateSelect: (date: string) => void;
  month: Date;
  onMonthChange: (date: Date) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getDotColor(data: { taken: number; total: number; rate: number } | undefined, isFuture: boolean): string {
  if (isFuture || !data) return 'bg-telegram-hint/20';
  if (data.total === 0) return 'bg-telegram-hint/20';
  if (data.rate === 100) return 'bg-emerald-500';
  if (data.rate > 0) return 'bg-amber-400';
  return 'bg-red-400';
}

export function MedicationCalendar({ dailyData, selectedDate, onDateSelect, month, onMonthChange }: MedicationCalendarProps) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const monthLabel = month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Build calendar grid for the month (Mon-Sun layout)
  const weeks = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const firstDay = new Date(year, m, 1);
    const lastDay = new Date(year, m + 1, 0);

    // Day of week: 0=Sun, adjust to Mon=0
    let startDow = firstDay.getDay() - 1;
    if (startDow < 0) startDow = 6;

    const rows: Array<Array<{ date: Date; dateStr: string; inMonth: boolean; isFuture: boolean; isToday: boolean } | null>> = [];
    let currentWeek: typeof rows[0] = [];

    // Fill leading empty cells
    for (let i = 0; i < startDow; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const d = new Date(year, m, day);
      const dateStr = toDateStr(d);
      currentWeek.push({
        date: d,
        dateStr,
        inMonth: true,
        isFuture: d > today,
        isToday: isSameDay(d, today),
      });
      if (currentWeek.length === 7) {
        rows.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill trailing empty cells
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      rows.push(currentWeek);
    }

    return rows;
  }, [month, today]);

  const goToPrevMonth = () => {
    const prev = new Date(month.getFullYear(), month.getMonth() - 1, 1);
    onMonthChange(prev);
  };

  const goToNextMonth = () => {
    const next = new Date(month.getFullYear(), month.getMonth() + 1, 1);
    onMonthChange(next);
  };

  // Direction for animation
  const direction = useMemo(() => {
    return 0; // We'll use layout animation instead
  }, []);

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goToPrevMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-telegram-hint/10 active:scale-90 transition-transform"
          aria-label="Previous month"
        >
          <ChevronLeft className="w-5 h-5 text-telegram-hint" />
        </button>
        <span className="text-sm font-semibold text-telegram-text">{monthLabel}</span>
        <button
          onClick={goToNextMonth}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-telegram-hint/10 active:scale-90 transition-transform"
          aria-label="Next month"
        >
          <ChevronRight className="w-5 h-5 text-telegram-hint" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAY_LABELS.map((label) => (
          <div key={label} className="text-center text-[10px] font-medium text-telegram-hint uppercase">
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${month.getFullYear()}-${month.getMonth()}`}
          initial={{ opacity: 0, x: direction }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -direction }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          className="space-y-1"
        >
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (!cell) {
                  return <div key={ci} className="aspect-square" />;
                }

                const dayData = dailyData[cell.dateStr];
                const dotColor = getDotColor(dayData, cell.isFuture);
                const isSelected = selectedDate === cell.dateStr;

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => !cell.isFuture && onDateSelect(cell.dateStr)}
                    disabled={cell.isFuture}
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5
                      transition-all duration-150
                      ${cell.isFuture ? 'opacity-30 cursor-default' : 'active:scale-90 cursor-pointer'}
                      ${isSelected ? 'ring-2 ring-telegram-link bg-telegram-link/10' : 'hover:bg-telegram-hint/5'}
                    `}
                    aria-label={`${cell.dateStr}${cell.isToday ? ' (today)' : ''}`}
                  >
                    <span className={`text-xs leading-none ${
                      isSelected ? 'font-bold text-telegram-link' :
                      cell.isToday ? 'font-bold text-telegram-text' :
                      'text-telegram-text'
                    }`}>
                      {cell.date.getDate()}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                    {cell.isToday && (
                      <div className="w-1 h-1 rounded-full bg-telegram-link" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center justify-center gap-3 mt-3 pt-3 border-t border-telegram-hint/10">
        {[
          { color: 'bg-emerald-500', label: '100%' },
          { color: 'bg-amber-400', label: 'Partial' },
          { color: 'bg-red-400', label: 'Missed' },
          { color: 'bg-telegram-hint/20', label: 'No data' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-[10px] text-telegram-hint">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
