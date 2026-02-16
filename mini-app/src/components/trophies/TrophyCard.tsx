import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import type { Trophy, UserTrophy } from '@/api/trophies';

const RARITY_STYLES: Record<string, { border: string; badge: string; text: string }> = {
  common: { border: 'border-gray-300', badge: 'bg-gray-100 text-gray-600', text: 'text-gray-500' },
  rare: { border: 'border-blue-300', badge: 'bg-blue-50 text-blue-600', text: 'text-blue-500' },
  epic: { border: 'border-purple-300', badge: 'bg-purple-50 text-purple-600', text: 'text-purple-500' },
  legendary: { border: 'border-yellow-300', badge: 'bg-yellow-50 text-yellow-600', text: 'text-yellow-500' },
};

interface TrophyCardProps {
  trophy: Trophy;
  earned: UserTrophy | undefined;
  onTap: (trophy: Trophy) => void;
  index: number;
}

export function TrophyCard({ trophy, earned, onTap, index }: TrophyCardProps) {
  const { t } = useTranslation();
  const isEarned = !!earned;
  const style = RARITY_STYLES[trophy.rarity] ?? RARITY_STYLES.common;

  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onTap(trophy)}
      className={`relative bg-telegram-secondaryBg rounded-2xl p-4 text-center border transition-shadow ${
        isEarned
          ? `${style.border} trophy-card-shine`
          : 'border-telegram-hint/10 grayscale opacity-70'
      }`}
    >
      {/* Icon */}
      <div className="text-4xl mb-2 relative" role="img" aria-label={trophy.name}>
        {trophy.icon_emoji}
        {!isEarned && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-5 h-5 text-telegram-hint/60" />
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-xs font-semibold line-clamp-2 mb-1">{trophy.name}</div>

      {/* Rarity badge */}
      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${style.badge}`}>
        {t(`trophy.rarity_${trophy.rarity}`)}
      </span>

      {/* Hint for unearned */}
      {!isEarned && trophy.description && (
        <div className="mt-1.5 text-[10px] text-telegram-hint line-clamp-2">
          {trophy.description}
        </div>
      )}
    </motion.button>
  );
}
