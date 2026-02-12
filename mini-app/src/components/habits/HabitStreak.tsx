import { memo } from 'react';
import { Flame, Award } from 'lucide-react';
import { motion } from 'framer-motion';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface HabitStreakProps {
  streakDays: number;
  longestStreak: number;
  weekData: boolean[];
}

export const HabitStreak = memo(function HabitStreak({ streakDays, longestStreak, weekData }: HabitStreakProps) {
  return (
    <div className="space-y-3">
      {/* Streak counter card */}
      <div
        className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-sm"
        aria-label={`Current streak: ${streakDays} days, Longest: ${longestStreak} days`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3" aria-hidden="true">
              <motion.div
                animate={streakDays > 0 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-8 h-8 text-white" />
              </motion.div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{streakDays}</div>
              <div className="text-orange-100 text-sm">day{streakDays !== 1 ? 's' : ''} streak</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Award className="w-4 h-4 text-orange-100" />
            <span className="text-sm text-white font-medium">Best: {longestStreak}</span>
          </div>
        </div>

        {/* Progress bar toward longest */}
        {streakDays > 0 && longestStreak > 0 && (
          <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((streakDays / longestStreak) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* 7-day calendar row */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/20">
        <p className="text-sm text-telegram-hint mb-3">Last 7 days</p>
        <div className="flex justify-between">
          {DAY_LABELS.map((label, i) => {
            const completed = weekData[i] ?? false;
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-telegram-hint">{label}</span>
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                    completed
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                      : 'bg-telegram-hint/10 text-telegram-hint/40'
                  }`}
                >
                  {completed ? '✓' : '·'}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
