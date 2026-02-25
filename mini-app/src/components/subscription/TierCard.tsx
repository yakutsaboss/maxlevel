import { motion } from 'framer-motion';
import { Crown, Users, Star, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TierInfo, SubscriptionTier } from '@/types';

interface TierCardProps {
  tier: TierInfo;
  isCurrent: boolean;
  isUpgrading?: boolean;
  onUpgrade?: () => void;
}

const TIER_GRADIENT: Record<SubscriptionTier, string> = {
  free: 'from-gray-500/10 to-gray-600/10',
  subscriber: 'from-blue-500/10 to-blue-600/10',
  premium: 'from-amber-500/10 to-orange-500/10',
};

const TIER_BORDER: Record<SubscriptionTier, string> = {
  free: 'border-gray-500/20',
  subscriber: 'border-blue-500/30',
  premium: 'border-amber-500/30',
};

const TIER_RING: Record<SubscriptionTier, string> = {
  free: 'ring-gray-500',
  subscriber: 'ring-blue-500',
  premium: 'ring-emerald-500',
};

const TIER_ICON_BG: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500',
  subscriber: 'bg-blue-500',
  premium: 'bg-gradient-to-br from-amber-500 to-orange-500',
};

const TIER_BUTTON: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500 hover:bg-gray-600',
  subscriber: 'bg-blue-500 hover:bg-blue-600',
  premium: 'bg-gradient-to-r from-amber-500 to-orange-500',
};

function TierIcon({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'premium') return <Star className="w-5 h-5" />;
  if (tier === 'subscriber') return <Users className="w-5 h-5" />;
  return <Crown className="w-5 h-5" />;
}

export function TierCard({ tier, isCurrent, isUpgrading, onUpgrade }: TierCardProps) {
  const { t } = useTranslation();

  const tierKey = tier.tier as SubscriptionTier;

  const features = getTierFeatures(tier);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative rounded-2xl p-4 border bg-gradient-to-br
        ${TIER_GRADIENT[tierKey]}
        ${TIER_BORDER[tierKey]}
        ${isCurrent ? `ring-2 ${TIER_RING[tierKey]}` : ''}
      `}
    >
      {isCurrent && (
        <span className="absolute -top-2.5 left-4 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-500 text-white">
          {t('subscription.currentPlan')}
        </span>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className={`${TIER_ICON_BG[tierKey]} w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
          <TierIcon tier={tierKey} />
        </div>
        <div>
          <h3 className="font-semibold text-sm text-telegram-text">
            {t(`settings.subscription.tier_${tierKey}`)}
          </h3>
          <p className="text-xs text-telegram-hint mt-0.5">
            {tier.price
              ? t('subscription.pricePerMonth', { price: tier.price })
              : t('subscription.free')}
          </p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-1.5 mb-4">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-xs text-telegram-hint">
            <Check className="w-3 h-3 text-emerald-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {/* Mode count badge */}
      <div className="text-xs text-center py-1.5 rounded-lg bg-telegram-bg/50 mb-3">
        <span className="font-semibold text-telegram-text">{tier.mode_limit}</span>
        <span className="text-telegram-hint ml-1">{t('subscription.modesAvailable')}</span>
      </div>

      {/* Action */}
      {isCurrent ? (
        <div className="flex items-center justify-center gap-2 py-2">
          <Check className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-semibold text-emerald-500">{t('subscription.active')}</span>
        </div>
      ) : onUpgrade ? (
        <button
          onClick={onUpgrade}
          disabled={isUpgrading}
          className={`w-full py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5 ${TIER_BUTTON[tierKey]}`}
        >
          {isUpgrading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              {t('settings.subscription.processing')}
            </>
          ) : tier.channel_required ? (
            t('subscription.joinChannel')
          ) : (
            t('settings.subscription.upgradePremium')
          )}
        </button>
      ) : null}
    </motion.div>
  );
}

function getTierFeatures(tier: TierInfo): string[] {
  const features: string[] = [];
  if (tier.tier === 'free') {
    features.push('2 active modes', 'Basic quests & achievements', 'Daily streaks');
  } else if (tier.tier === 'subscriber') {
    features.push('3 active modes', 'Free channel subscription', 'All Free features');
  } else {
    features.push('6 active modes', 'Animated avatars', 'Exclusive rewards', 'Priority support');
  }
  return features;
}
