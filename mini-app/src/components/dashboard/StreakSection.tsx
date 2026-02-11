import { memo } from 'react';
import { Flame, Award, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserStats } from '@/types';

const STREAK_MILESTONES: { days: number; label: string; icon: string }[] = [
  { days: 7, label: '1 Week Streak!', icon: '🔥' },
  { days: 14, label: '2 Week Streak!', icon: '🔥🔥' },
  { days: 30, label: '1 Month Streak!', icon: '💎' },
  { days: 60, label: '2 Month Streak!', icon: '⚡' },
  { days: 100, label: 'Legendary 100 Days!', icon: '👑' },
];

function getActiveMilestone(current: number) {
  // Return the highest milestone that the streak has reached
  for (let i = STREAK_MILESTONES.length - 1; i >= 0; i--) {
    if (current >= STREAK_MILESTONES[i].days) return STREAK_MILESTONES[i];
  }
  return null;
}

interface StreakSectionProps {
  streakData: UserStats['streakData'];
  perModeStreaks: UserStats['perModeStreaks'];
}

export const StreakSection = memo(function StreakSection({ streakData, perModeStreaks }: StreakSectionProps) {
  const milestone = getActiveMilestone(streakData.current);

  return (
    <div className="px-4 mt-6" role="region" aria-label="Your streak">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" aria-hidden="true" />Your Streak</h2>

      {/* Milestone celebration banner */}
      {milestone && (
        <motion.div
          className="mb-3 rounded-2xl p-3 border border-orange-400/30 bg-gradient-to-r from-orange-500/15 to-amber-500/15 overflow-hidden relative"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl"
            animate={{ boxShadow: ['0 0 8px rgba(251,146,60,0.3)', '0 0 20px rgba(251,146,60,0.5)', '0 0 8px rgba(251,146,60,0.3)'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="flex items-center gap-3 relative z-10">
            <motion.span
              className="text-2xl"
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              {milestone.icon}
            </motion.span>
            <div>
              <p className="text-sm font-bold text-orange-400">{milestone.label}</p>
              <p className="text-xs text-telegram-hint">Keep the fire burning!</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Aggregate streak card */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl p-4 shadow-sm" aria-label={`Current streak: ${streakData.current} days, Best: ${streakData.longest} days, ${streakData.daysActive} days active`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3" aria-hidden="true">
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
                aria-label={`${streak.mode_name}: ${streak.current_streak} day streak`}
              >
                <div className="text-2xl text-center mb-1" role="img" aria-label={streak.mode_name}>{streak.mode_icon}</div>
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
