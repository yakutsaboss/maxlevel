import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export interface DayActivity {
  date: string; // YYYY-MM-DD
  count: number;
  activities?: { name: string; duration: number; calories: number }[];
}

interface ActivityCalendarProps {
  data: DayActivity[];
  onDayTap?: (day: DayActivity) => void;
}

const CELL_SIZE = 14;
const CELL_GAP = 3;
const WEEKS_TO_SHOW = 13; // ~3 months

function getIntensity(count: number): string {
  if (count === 0) return 'bg-telegram-hint/10';
  if (count <= 2) return 'bg-green-400/40';
  if (count <= 4) return 'bg-green-500/70';
  return 'bg-green-500';
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function getDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function ActivityCalendar({ data, onDayTap }: ActivityCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<DayActivity | null>(null);

  // Build a map for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, DayActivity>();
    for (const d of data) {
      map.set(d.date, d);
    }
    return map;
  }, [data]);

  // Generate grid: 7 rows (Sun-Sat) x WEEKS_TO_SHOW columns, ending today
  const { grid, monthLabels } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the start date: go back WEEKS_TO_SHOW weeks from end of this week
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
    const startDate = new Date(endOfWeek);
    startDate.setDate(startDate.getDate() - (WEEKS_TO_SHOW * 7 - 1));

    const cells: { date: Date; dateStr: string; count: number; col: number; row: number; isFuture: boolean }[] = [];
    const labels: { text: string; col: number }[] = [];
    let lastMonth = -1;

    const cursor = new Date(startDate);
    for (let week = 0; week < WEEKS_TO_SHOW; week++) {
      for (let day = 0; day < 7; day++) {
        const d = new Date(cursor);
        const dateStr = d.toISOString().slice(0, 10);
        const entry = activityMap.get(dateStr);
        const isFuture = d > today;

        cells.push({
          date: d,
          dateStr,
          count: isFuture ? -1 : (entry?.count ?? 0),
          col: week,
          row: day,
          isFuture,
        });

        // Month label on first visible Monday of a new month
        if (day === 0 && d.getMonth() !== lastMonth) {
          labels.push({ text: getMonthLabel(d), col: week });
          lastMonth = d.getMonth();
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return { grid: cells, monthLabels: labels };
  }, [activityMap]);

  const handleDayTap = (cell: typeof grid[0]) => {
    if (cell.isFuture) return;
    const entry = activityMap.get(cell.dateStr) ?? { date: cell.dateStr, count: 0, activities: [] };
    setSelectedDay(entry);
    onDayTap?.(entry);
  };

  const totalWidth = WEEKS_TO_SHOW * (CELL_SIZE + CELL_GAP);

  return (
    <div className="relative">
      {/* Month labels */}
      <div className="flex mb-1 ml-6" style={{ width: totalWidth }}>
        {monthLabels.map((label) => (
          <span
            key={`${label.text}-${label.col}`}
            className="text-[10px] text-telegram-hint absolute"
            style={{ left: label.col * (CELL_SIZE + CELL_GAP) + 24 }}
          >
            {label.text}
          </span>
        ))}
      </div>

      <div className="flex mt-4">
        {/* Day-of-week labels */}
        <div className="flex flex-col mr-1.5" style={{ gap: CELL_GAP }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={i} className="text-[9px] text-telegram-hint flex items-center justify-end" style={{ height: CELL_SIZE, width: 16 }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="relative overflow-x-auto">
          <svg
            width={totalWidth}
            height={7 * (CELL_SIZE + CELL_GAP) - CELL_GAP}
            role="img"
            aria-label="Activity calendar heatmap"
          >
            {grid.map((cell) => (
              <rect
                key={cell.dateStr}
                x={cell.col * (CELL_SIZE + CELL_GAP)}
                y={cell.row * (CELL_SIZE + CELL_GAP)}
                width={CELL_SIZE}
                height={CELL_SIZE}
                rx={3}
                className={`cursor-pointer transition-colors ${
                  cell.isFuture
                    ? 'fill-transparent'
                    : selectedDay?.date === cell.dateStr
                      ? 'fill-telegram-link stroke-telegram-link stroke-2'
                      : ''
                }`}
                fill={cell.isFuture ? 'transparent' : undefined}
                style={
                  !cell.isFuture && selectedDay?.date !== cell.dateStr
                    ? { fill: getCellColor(cell.count) }
                    : undefined
                }
                onClick={() => handleDayTap(cell)}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-telegram-hint mr-1">Less</span>
        {[0, 1, 3, 5].map((n) => (
          <div
            key={n}
            className={`rounded-sm ${getIntensity(n)}`}
            style={{ width: 10, height: 10 }}
          />
        ))}
        <span className="text-[10px] text-telegram-hint ml-1">More</span>
      </div>

      {/* Selected day detail popover */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-3 bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-telegram-text">
                {getDayLabel(new Date(selectedDay.date + 'T00:00:00'))}
              </span>
              <button onClick={() => setSelectedDay(null)} className="text-telegram-hint">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {selectedDay.count === 0 ? (
              <p className="text-[11px] text-telegram-hint">No activities this day</p>
            ) : (
              <div className="space-y-1.5">
                {selectedDay.activities?.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-telegram-text">{a.name}</span>
                    <span className="text-telegram-hint">
                      {a.duration}min &middot; {a.calories}cal
                    </span>
                  </div>
                )) ?? (
                  <p className="text-[11px] text-telegram-hint">{selectedDay.count} activities</p>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function getCellColor(count: number): string {
  if (count === 0) return 'var(--tg-theme-hint-color, #999)';
  if (count <= 2) return 'rgba(74, 222, 128, 0.4)';
  if (count <= 4) return 'rgba(34, 197, 94, 0.7)';
  return 'rgb(34, 197, 94)';
}
