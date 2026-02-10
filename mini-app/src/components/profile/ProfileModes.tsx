import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserStats } from '@/types';
import { formatDate } from '@/utils/formatDate';

interface ProfileModesProps {
  modes: UserStats['modes'];
  perModeStreaks: UserStats['perModeStreaks'];
  haptic: { impact: (...args: any[]) => void };
}

export function ProfileModes({ modes, perModeStreaks, haptic }: ProfileModesProps) {
  return (
    <div className="px-4 mt-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-telegram-link" />My Modes
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((userMode, index) => {
          const modeStreak = perModeStreaks?.find((s) => s.mode_id === userMode.mode_id);
          return (
            <motion.div key={userMode.mode_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => haptic.impact('light')} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="text-4xl text-center mb-2">{userMode.mode.icon}</div>
              <h3 className="font-semibold text-center text-sm">{userMode.mode.display_name}</h3>
              <p className="text-xs text-telegram-hint text-center mt-1">Since {formatDate(userMode.activated_at)}</p>
              {modeStreak && modeStreak.current_streak > 0 ? (
                <p className="text-xs text-center mt-1.5 font-medium text-orange-500">🔥 {modeStreak.current_streak} day streak</p>
              ) : modeStreak ? (
                <p className="text-xs text-center mt-1.5 text-telegram-hint">No active streak</p>
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
