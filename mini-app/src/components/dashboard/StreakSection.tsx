import { memo } from 'react';
import { Flame, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserStats } from '@/types';

interface StreakSectionProps {
  streakData: UserStats['streakData'];
  perModeStreaks: UserStats['perModeStreaks'];
}

export const StreakSection = memo(function StreakSection({ streakData, perModeStreaks }: StreakSectionProps) {
  return (
    <div className="px-4 mt-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" />Your Streak</h2>

      {/* Aggregate streak card */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
              <motion.div
                animate={streakData.current > 0 ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame className="w-8 h-8 text-white" />
              </motion.div>
            </div>
            <div>
              <div className="text-3xl font-bold text-white">{streakData.current}</div>
              <div className="text-orange-100 text-sm">day{streakData.current !== 1 ? 's' : ''} in a row</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Award className="w-4 h-4 text-orange-100" />
              <span className="text-sm text-white font-medium">Best: {streakData.longest}</span>
            </div>
            <div className="flex items-center gap-1.5 justify-end">
              <Calendar className="w-4 h-4 text-orange-100" />
              <span className="text-sm text-white font-medium">{streakData.daysActive} active</span>
            </div>
          </div>
        </div>
        {streakData.current > 0 && streakData.longest > 0 && (
          <div className="mt-3 bg-white/20 backdrop-blur-sm rounded-full h-2 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((streakData.current / streakData.longest) * 100, 100)}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      {/* Per-mode streak breakdown */}
      {perModeStreaks && perModeStreaks.length > 0 && (() => {
        const maxStreak = Math.max(...perModeStreaks.map(s => s.current_streak));
        return (
          <div className="flex gap-2 overflow-x-auto pb-1 mt-3">
            {perModeStreaks.map((streak) => (
              <motion.div
                key={streak.mode_id}
                className={`flex-shrink-0 rounded-xl px-4 py-3 border ${streak.current_streak === maxStreak && maxStreak > 0 ? 'bg-orange-500/10 border-orange-500/30' : 'bg-telegram-secondaryBg border-telegram-hint/20'}`}
                whileHover={{ scale: 1.05 }}
              >
                <div className="text-2xl text-center mb-1">{streak.mode_icon}</div>
                <div className="text-center">
                  <span className="text-lg font-bold">{streak.current_streak}</span>
                  {streak.current_streak > 0 && <span className="ml-1">🔥</span>}
                </div>
                <div className="text-xs text-telegram-hint text-center truncate max-w-[80px]">{streak.mode_name}</div>
              </motion.div>
            ))}
          </div>
        );
      })()}
    </div>
  );
});
