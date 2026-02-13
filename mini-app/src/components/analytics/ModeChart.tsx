import { motion } from 'framer-motion';
import type { WeeklyXpItem, QuestHistoryItem } from '@/components/analytics/useModeAnalytics';

export function ProgressRing({ percent, size = 48 }: { percent: number; size?: number }) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-telegram-hint/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="text-telegram-link"
      />
    </svg>
  );
}

export function WeeklyXpChart({ data }: { data: WeeklyXpItem[] }) {
  const maxXp = Math.max(...data.map((d) => d.xp), 1);

  return (
    <div className="flex items-end gap-1.5 h-20">
      {data.map((item) => {
        const height = Math.max((item.xp / maxXp) * 100, 4);
        const dayLabel = new Date(item.day).toLocaleDateString(undefined, { weekday: 'short' });
        return (
          <div key={item.day} className="flex flex-col items-center flex-1 gap-1">
            <span className="text-[10px] text-telegram-hint">{item.xp}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${height}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="w-full rounded-t-sm bg-telegram-link/70 min-h-[2px]"
            />
            <span className="text-[10px] text-telegram-hint">{dayLabel}</span>
          </div>
        );
      })}
    </div>
  );
}

export function QuestHistoryList({ quests }: { quests: QuestHistoryItem[] }) {
  const statusColors: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    failed: 'bg-red-500/20 text-red-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    in_progress: 'bg-blue-500/20 text-blue-400',
    skipped: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <div className="space-y-2">
      {quests.slice(0, 10).map((quest) => (
        <div
          key={quest.id}
          className="flex items-center justify-between bg-telegram-secondaryBg rounded-xl px-3 py-2 border border-telegram-hint/10"
        >
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-telegram-text truncate">{quest.title}</div>
            <div className="text-xs text-telegram-hint mt-0.5">
              {new Date(quest.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              {' \u00B7 '}
              {quest.check_ins}/{quest.target} check-ins
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2">
            {quest.xp_awarded > 0 && (
              <span className="text-xs font-semibold text-telegram-link">+{quest.xp_awarded} XP</span>
            )}
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${statusColors[quest.status] || 'bg-gray-500/20 text-gray-400'}`}>
              {quest.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
