import { useState } from 'react';
import { Achievement, UserAchievement } from '@/types';
import { Star, Lock, CheckCircle, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { HapticImpactOnly } from '@/types/telegram';
import { AchievementProgressBar } from './AchievementProgressBar';
import { PremiumBadge } from './PremiumBadge';

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
  haptic: HapticImpactOnly;
  onBuyClick?: (achievement: Achievement) => void;
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d);
}

function isRecentlyUnlocked(unlockedAt: string | undefined | null): boolean {
  if (!unlockedAt) return false;
  const unlockTime = new Date(unlockedAt).getTime();
  if (isNaN(unlockTime)) return false;
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return unlockTime > oneDayAgo;
}

function getCriteriaHint(criteria?: Record<string, unknown>): string {
  if (!criteria || !criteria.type) return 'Keep playing to discover how to unlock this!';
  const mode = criteria.mode as string | undefined;
  const modeLabel = mode ? ` ${mode}` : '';
  switch (criteria.type) {
    case 'quest_complete':
      return `Complete ${criteria.count}${modeLabel} quest${(criteria.count as number) > 1 ? 's' : ''}`;
    case 'streak':
      return `Maintain a ${criteria.days}-day${modeLabel} streak`;
    case 'quest_complete_consecutive':
      return `Complete${modeLabel} quests ${criteria.days} days in a row`;
    case 'multi_mode_active':
      return `Activate ${criteria.count} modes at once`;
    case 'streak_rebuild':
      return `Rebuild a ${criteria.days}-day streak`;
    case 'level_reached':
    case 'level':
      return `Reach level ${criteria.level}`;
    case 'total_xp':
      return `Earn ${Number(criteria.amount).toLocaleString()} total XP`;
    case 'friend_count':
      return `Make ${criteria.count} friend${(criteria.count as number) > 1 ? 's' : ''}`;
    case 'challenge_created':
      return `Create ${criteria.count} challenge${(criteria.count as number) > 1 ? 's' : ''}`;
    case 'challenge_completed':
      return `Complete ${criteria.count} challenge${(criteria.count as number) > 1 ? 's' : ''}`;
    case 'quest_count':
      return `Complete ${criteria.count} quest${(criteria.count as number) > 1 ? 's' : ''}`;
    case 'night_quest':
      return `Complete a quest after ${criteria.hour ?? 22}:00`;
    case 'early_quest':
      return `Complete a quest before ${criteria.hour ?? 6}:00`;
    case 'weekend_quests':
      return `Complete ${criteria.count} weekend quests`;
    case 'all_daily_complete':
      return `Have ${criteria.days} perfect days`;
    case 'purchasable':
      return 'Available for purchase in the shop';
    default:
      return 'Keep playing to discover how to unlock this!';
  }
}

/** Get the target value for progress tracking from criteria */
function getTargetFromCriteria(criteria?: Record<string, unknown>): number {
  if (!criteria?.type) return 0;
  const type = criteria.type as string;
  switch (type) {
    case 'friend_count':
    case 'challenge_created':
    case 'challenge_completed':
    case 'quest_count':
    case 'quest_complete':
    case 'quest_complete_consecutive':
    case 'multi_mode_active':
    case 'weekend_quests':
      return (criteria.count as number) ?? 0;
    case 'streak':
    case 'streak_rebuild':
    case 'all_daily_complete':
      return (criteria.days as number) ?? 0;
    case 'level':
    case 'level_reached':
      return (criteria.level as number) ?? 0;
    case 'total_xp':
      return (criteria.amount as number) ?? 0;
    case 'night_quest':
    case 'early_quest':
      return 1;
    default:
      return 0;
  }
}

const RARITY_GLOW: Record<string, string> = {
  legendary: 'shadow-[0_0_12px_rgba(234,179,8,0.4)]',
  epic: 'shadow-[0_0_10px_rgba(168,85,247,0.35)]',
  rare: 'shadow-[0_0_8px_rgba(59,130,246,0.3)]',
  common: '',
};

export function AchievementCard({ achievement: ach, userAchievement: userAch, isUnlocked, rarityStyle, index, haptic, onBuyClick }: AchievementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isNew = isUnlocked && userAch && isRecentlyUnlocked(userAch.unlocked_at);
  const glowClass = isUnlocked ? (RARITY_GLOW[ach.rarity] || '') : '';
  const target = getTargetFromCriteria(ach.criteria);
  const isPremium = ach.criteria?.type === 'purchasable';
  const isPurchased = isPremium && isUnlocked;

  const handleClick = () => {
    haptic.impact('light');
    if (isPremium && !isUnlocked && onBuyClick) {
      onBuyClick(ach);
      return;
    }
    setExpanded(prev => !prev);
  };

  return (
    <motion.button
      type="button"
      key={ach.id}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
      whileTap={{ scale: 0.97 }}
      onClick={handleClick}
      aria-label={`Achievement: ${isUnlocked ? (ach.name || 'Unknown') : isPremium ? (ach.name || 'Premium') : 'Locked'} — ${isUnlocked ? 'Unlocked' : isPremium ? 'Available for purchase' : 'Locked'}, ${ach.xp_reward ?? 0} XP reward`}
      aria-expanded={expanded}
      className={`rounded-2xl p-4 border relative text-left w-full ${
        isPurchased
          ? `bg-telegram-secondaryBg premium-card ${glowClass}`
          : isPremium && !isUnlocked
            ? 'bg-telegram-secondaryBg/80 premium-card-locked opacity-90'
            : isUnlocked
              ? `bg-telegram-secondaryBg ${rarityStyle.border} ${glowClass}`
              : 'bg-telegram-secondaryBg/60 border-telegram-hint/10 opacity-60'
      } ${isNew ? 'achievement-new' : ''}`}
    >
      {/* Premium badge overlay */}
      <PremiumBadge isPremium={isPremium} isPurchased={isPurchased} />

      {isNew && (
        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
          NEW
        </div>
      )}
      {isUnlocked && (
        <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-sm" aria-hidden="true">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
      {!isUnlocked && !isPremium && (
        <div className="absolute -top-1.5 -right-1.5 bg-telegram-hint/50 rounded-full p-0.5" aria-hidden="true">
          <Lock className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`text-4xl text-center mb-2 ${!isUnlocked && !isPremium ? 'grayscale opacity-40' : ''}`}>
        {ach.icon || '🏆'}
      </div>
      <h3 className="text-sm font-semibold text-center line-clamp-2 mb-1">
        {isUnlocked || isPremium ? ach.name : '???'}
      </h3>

      {isUnlocked ? (
        <>
          <p className="text-xs text-telegram-hint text-center line-clamp-2 mb-2">
            {ach.description}
          </p>
          <div className="flex items-center justify-center gap-1 bg-green-100 rounded-full px-2 py-0.5" aria-label={`Earned ${ach.xp_reward ?? 0} XP`}>
            <Zap className="w-3.5 h-3.5 text-green-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-green-700">+{ach.xp_reward ?? 0} XP</span>
          </div>
          {userAch && (
            <p className="text-[10px] text-telegram-hint text-center mt-1">
              {formatDate(userAch.unlocked_at)}
            </p>
          )}
        </>
      ) : isPremium ? (
        <>
          <p className="text-xs text-amber-600 text-center line-clamp-2 mb-2">
            {ach.description}
          </p>
          <div className="flex items-center justify-center gap-1 bg-amber-100 rounded-full px-2 py-0.5" aria-label={`Reward: ${ach.xp_reward ?? 0} XP`}>
            <Star className="w-3 h-3 text-amber-500" aria-hidden="true" />
            <span className="text-xs text-amber-600 font-medium">+{ach.xp_reward ?? 0} XP</span>
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] text-telegram-hint text-center italic line-clamp-2 mb-1">
            {getCriteriaHint(ach.criteria)}
          </p>
          {/* Progress bar for locked achievements */}
          <AchievementProgressBar
            criteria={ach.criteria}
            currentValue={0}
            targetValue={target}
          />
          <div className="flex items-center justify-center gap-1 bg-telegram-hint/10 rounded-full px-2 py-0.5 mt-1.5" aria-label={`Reward: ${ach.xp_reward ?? 0} XP`}>
            <Star className="w-3 h-3 text-telegram-hint" aria-hidden="true" />
            <span className="text-xs text-telegram-hint font-medium">+{ach.xp_reward ?? 0} XP</span>
          </div>
        </>
      )}

      {/* Expand indicator */}
      <div className="flex justify-center mt-1">
        <ChevronDown className={`w-3.5 h-3.5 text-telegram-hint/40 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-telegram-hint/10 text-[11px] text-telegram-hint space-y-1">
              {isUnlocked && ach.description && (
                <p>{ach.description}</p>
              )}
              <p className="italic">{getCriteriaHint(ach.criteria)}</p>
              <div className="flex items-center justify-between">
                <span className={`font-medium ${rarityStyle.text}`}>{rarityStyle.label}</span>
                <span>+{ach.xp_reward ?? 0} XP</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
