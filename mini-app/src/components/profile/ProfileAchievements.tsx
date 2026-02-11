import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { UserAchievement, Achievement } from '@/types';
import type { HapticImpactOnly } from '@/types/telegram';

interface ProfileAchievementsProps {
  achievements: UserAchievement[];
  allAchievements: Achievement[];
  haptic: HapticImpactOnly;
  onViewAll: () => void;
}

export function ProfileAchievements({ achievements, allAchievements, haptic, onViewAll }: ProfileAchievementsProps) {
  const total = allAchievements.length || achievements.length;
  const unlocked = achievements.length;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;

  return (
    <div className="px-4 mt-6 mb-6">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-telegram-link" aria-hidden="true" />Achievements
      </h2>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
      >
        {/* Progress indicator */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-telegram-hint">{unlocked}/{total} unlocked</span>
            <span className="text-xs font-semibold text-telegram-link">{pct}%</span>
          </div>
          <div className="w-full h-2 bg-telegram-bg rounded-full overflow-hidden" role="progressbar" aria-valuenow={unlocked} aria-valuemin={0} aria-valuemax={total} aria-label={`Achievement progress: ${unlocked} of ${total} unlocked`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
            />
          </div>
        </div>
        {/* Achievement grid (2x2) */}
        {achievements.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5 mb-3">
            {achievements
              .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
              .slice(0, 4)
              .map((ua) => {
                const rarity = ua.achievement.rarity || ua.achievement.category || '';
                const rarityColor = rarity === 'legendary' ? 'text-yellow-500' : rarity === 'epic' ? 'text-purple-500' : rarity === 'rare' ? 'text-blue-500' : 'text-telegram-hint';
                return (
                  <motion.button
                    type="button"
                    key={ua.achievement_id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => haptic.impact('light')}
                    className="bg-telegram-bg rounded-xl p-3 text-center cursor-pointer"
                    aria-label={`Achievement: ${ua.achievement.name}${rarity ? `, ${rarity}` : ''}`}
                  >
                    <div className="text-3xl mb-1" role="img" aria-label={ua.achievement.name}>{ua.achievement.icon}</div>
                    <div className="text-xs font-medium line-clamp-1">{ua.achievement.name}</div>
                    {rarity && <div className={`text-[10px] font-semibold capitalize mt-0.5 ${rarityColor}`}>{rarity}</div>}
                  </motion.button>
                );
              })}
          </div>
        ) : (
          <p className="text-sm text-telegram-hint mb-3">Complete quests to earn achievements!</p>
        )}
        <button
          onClick={() => { haptic.impact('light'); onViewAll(); }}
          className="w-full py-2.5 rounded-xl bg-telegram-link/10 text-telegram-link text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          View all achievements
        </button>
      </motion.div>
    </div>
  );
}
