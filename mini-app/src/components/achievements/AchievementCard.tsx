import { Achievement, UserAchievement } from '@/types';
import { Star, Lock, CheckCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface RarityStyle {
  border: string;
  bg: string;
  text: string;
  label: string;
}

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement?: UserAchievement;
  isUnlocked: boolean;
  rarityStyle: RarityStyle;
  index: number;
  haptic: { impact: (...args: any[]) => void };
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateStr));
}

function isRecentlyUnlocked(unlockedAt: string): boolean {
  const unlockTime = new Date(unlockedAt).getTime();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return unlockTime > oneDayAgo;
}

export function AchievementCard({ achievement: ach, userAchievement: userAch, isUnlocked, rarityStyle, index, haptic }: AchievementCardProps) {
  const isNew = isUnlocked && userAch && isRecentlyUnlocked(userAch.unlocked_at);

  return (
    <motion.div
      key={ach.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => haptic.impact('light')}
      className={`rounded-2xl p-4 border relative ${
        isUnlocked
          ? `bg-telegram-secondaryBg ${rarityStyle.border}`
          : 'bg-telegram-secondaryBg/60 border-telegram-hint/10 opacity-60'
      } ${isNew ? 'achievement-new' : ''}`}
    >
      {isNew && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
          NEW
        </div>
      )}
      {isUnlocked && (
        <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-sm">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
      {!isUnlocked && (
        <div className="absolute -top-1.5 -right-1.5 bg-telegram-hint/50 rounded-full p-0.5">
          <Lock className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`text-4xl text-center mb-2 ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
        {isUnlocked ? ach.icon : '?'}
      </div>
      <h3 className="text-sm font-semibold text-center line-clamp-2 mb-1">
        {isUnlocked ? ach.name : '???'}
      </h3>
      {isUnlocked ? (
        <>
          <p className="text-xs text-telegram-hint text-center line-clamp-2 mb-2">
            {ach.description}
          </p>
          <div className="flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 text-yellow-500" />
            <span className="text-xs font-semibold text-yellow-600">+{ach.xp_reward} XP</span>
          </div>
          {userAch && (
            <p className="text-[10px] text-telegram-hint text-center mt-1">
              {formatDate(userAch.unlocked_at)}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center gap-1 mt-1">
          <Star className="w-3 h-3 text-telegram-hint" />
          <span className="text-xs text-telegram-hint">{ach.xp_reward} XP</span>
        </div>
      )}
    </motion.div>
  );
}
