import { TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserStats } from '@/types';
import { formatDate } from '@/utils/formatDate';
import type { HapticImpactOnly } from '@/types/telegram';

interface ProfileModesProps {
  modes: UserStats['modes'];
  perModeStreaks: UserStats['perModeStreaks'];
  haptic: HapticImpactOnly;
}

export function ProfileModes({ modes, perModeStreaks, haptic }: ProfileModesProps) {
  return (
    <div className="px-4 mt-6" role="region" aria-label="My modes">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-telegram-link" aria-hidden="true" />My Modes
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {modes.map((userMode, index) => {
          const modeStreak = perModeStreaks?.find((s) => s.mode_id === userMode.mode_id);
          return (
            <motion.button type="button" key={userMode.mode_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => haptic.impact('light')} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-left" aria-label={`Mode: ${userMode.mode.display_name}${modeStreak && modeStreak.current_streak > 0 ? `, ${modeStreak.current_streak} day streak` : ''}`}>
              <div className="relative inline-flex justify-center w-full mb-2">
                <div className="text-4xl" role="img" aria-label={userMode.mode.display_name}>{userMode.mode.icon}</div>
                {modeStreak && modeStreak.current_streak > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none shadow-sm">
                    🔥{modeStreak.current_streak}
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-center text-sm">{userMode.mode.display_name}</h3>
              <p className="text-xs text-telegram-hint text-center mt-1">Since {formatDate(userMode.activated_at)}</p>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
