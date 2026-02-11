import { memo } from 'react';
import { motion } from 'framer-motion';

interface DailyGoalRingProps {
  completedToday: number;
  totalDaily: number;
}

export const DailyGoalRing = memo(function DailyGoalRing({ completedToday, totalDaily }: DailyGoalRingProps) {
  const dailyProgress = totalDaily > 0 ? completedToday / totalDaily : 0;
  const size = 120;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - dailyProgress);
  const isComplete = totalDaily > 0 && completedToday >= totalDaily;

  return (
    <div className="px-4 mt-6">
      <div className={`rounded-2xl p-5 shadow-sm flex flex-col items-center ${isComplete ? 'bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20' : 'bg-telegram-secondaryBg border border-telegram-hint/10'}`}>
        <div className="relative" style={{ width: size, height: size }} role="img" aria-label={`Daily quest progress: ${completedToday} of ${totalDaily} completed`}>
          <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-telegram-hint/20" />
            <motion.circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className={isComplete ? 'text-green-500' : 'text-telegram-link'}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1, ease: 'easeOut' }}
              stroke="currentColor"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-telegram-text">{completedToday}/{totalDaily}</span>
          </div>
        </div>
        <div className="text-sm text-telegram-hint mt-2">Daily Quests</div>
        {isComplete && <div className="text-sm font-medium text-green-600 mt-1">All done! Great work!</div>}
      </div>
    </div>
  );
});
