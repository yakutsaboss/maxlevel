import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lock, Crown } from 'lucide-react';
import { TIER_ORDER, TIER_LABELS, TIER_COLORS } from '@/constants/tiers';
import type { SubscriptionTier } from '@/types';

export interface PremiumGateProps {
  /** Minimum tier required to see children */
  requiredTier: 'subscriber' | 'premium';
  /** User's current effective tier */
  effectiveTier: SubscriptionTier;
  children: React.ReactNode;
  /** Custom lock UI — if omitted, a default overlay is shown */
  fallback?: React.ReactNode;
}

function tierIndex(tier: SubscriptionTier): number {
  return TIER_ORDER.indexOf(tier);
}

/** Default lock overlay shown when the user's tier is insufficient */
function DefaultLockOverlay({ requiredTier }: { requiredTier: 'subscriber' | 'premium' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      className="relative rounded-2xl overflow-hidden"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {/* Blurred placeholder */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-6 flex flex-col items-center gap-3 text-center">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: `${TIER_COLORS[requiredTier]}20` }}
        >
          <Lock className="w-6 h-6" style={{ color: TIER_COLORS[requiredTier] }} />
        </div>

        <div>
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white mb-2"
            style={{ backgroundColor: TIER_COLORS[requiredTier] }}
          >
            <Crown className="w-3 h-3" />
            {TIER_LABELS[requiredTier]}
          </div>
          <p className="text-sm font-medium text-telegram-text">{t('premium.locked')}</p>
          <p className="text-xs text-telegram-hint mt-1">
            {t('premium.upgradeDesc', { tier: TIER_LABELS[requiredTier] })}
          </p>
        </div>

        <button
          onClick={() => navigate('/subscription')}
          className="mt-1 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-transform active:scale-95"
          style={{
            background: `linear-gradient(135deg, ${TIER_COLORS[requiredTier]}, ${requiredTier === 'premium' ? '#F97316' : '#2563EB'})`,
          }}
        >
          {t('premium.upgrade')}
        </button>
      </div>
    </motion.div>
  );
}

/**
 * PremiumGate — renders children if the user's tier meets the requirement,
 * otherwise renders a fallback lock overlay with an "Upgrade" CTA.
 *
 * Usage:
 *   <PremiumGate requiredTier="premium" effectiveTier={effectiveTier}>
 *     <PremiumFeature />
 *   </PremiumGate>
 */
export function PremiumGate({ requiredTier, effectiveTier, children, fallback }: PremiumGateProps) {
  const hasAccess = tierIndex(effectiveTier) >= tierIndex(requiredTier);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <DefaultLockOverlay requiredTier={requiredTier} />;
}
