import { Achievement, UserAchievement } from '@/types';
import { AchievementCard } from './AchievementCard';
import type { HapticImpactOnly } from '@/types/telegram';

export const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  common: { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Common' },
  rare: { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Rare' },
  epic: { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-600', label: 'Epic' },
  legendary: { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Legendary' },
};

interface RarityGroupProps {
  rarity: string;
  achievements: Achievement[];
  unlockedIds: Set<number>;
  userAchievements: UserAchievement[];
  haptic: HapticImpactOnly;
  hideHeader?: boolean;
  onBuyClick?: (achievement: Achievement) => void;
}

export function RarityGroup({ rarity, achievements, unlockedIds, userAchievements, haptic, hideHeader, onBuyClick }: RarityGroupProps) {
  const rarityStyle = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const unlockedInGroup = achievements.filter(a => unlockedIds.has(a.id)).length;

  return (
    <div role="region" aria-label={hideHeader ? 'Achievements' : `${rarityStyle.label} achievements — ${unlockedInGroup} of ${achievements.length} unlocked`}>
      {!hideHeader && (
        <div className="flex items-center justify-between mb-3">
          <h2 className={`text-lg font-semibold ${rarityStyle.text}`}>
            {rarityStyle.label}
          </h2>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
            unlockedInGroup === achievements.length
              ? 'bg-green-100 text-green-700'
              : 'bg-telegram-hint/10 text-telegram-hint'
          }`}>
            {unlockedInGroup} / {achievements.length} unlocked
          </span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {achievements.map((ach, index) => (
          <AchievementCard
            key={ach.id}
            achievement={ach}
            userAchievement={userAchievements.find(ua => ua.achievement_id === ach.id)}
            isUnlocked={unlockedIds.has(ach.id)}
            rarityStyle={RARITY_COLORS[ach.rarity] || rarityStyle}
            index={index}
            haptic={haptic}
            onBuyClick={onBuyClick}
          />
        ))}
      </div>
    </div>
  );
}
