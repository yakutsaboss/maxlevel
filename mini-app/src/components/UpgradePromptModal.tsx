import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Crown, Zap, Users } from 'lucide-react';
import { FocusTrap } from '@/components/FocusTrap';
import { TIER_COLORS, TIER_LABELS } from '@/constants/tiers';
import type { SubscriptionTier } from '@/types';

interface TierFeature {
  label: string;
  modes: number;
}

const TIER_FEATURES: Record<Exclude<SubscriptionTier, 'free'>, TierFeature> = {
  subscriber: { label: 'subscriber', modes: 3 },
  premium: { label: 'premium', modes: 6 },
};

export interface UpgradePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Name of the locked feature (shown in the header) */
  featureName?: string;
  /** Minimum tier required — determines which tier to highlight */
  requiredTier?: 'subscriber' | 'premium';
}

/**
 * UpgradePromptModal — shown when a user tries to access a locked premium feature.
 * Displays a mini tier comparison and routes to /subscription on "Upgrade Now".
 */
export function UpgradePromptModal({
  isOpen,
  onClose,
  featureName,
  requiredTier = 'subscriber',
}: UpgradePromptModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Prevent body scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleUpgrade = () => {
    onClose();
    navigate('/subscription');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap active onEscape={onClose} aria-label={t('premium.upgradeTitle')}>
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-8 sm:items-center sm:pb-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-sm bg-telegram-bg rounded-3xl shadow-2xl border border-telegram-hint/10 overflow-hidden"
              initial={{ scale: 0.92, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-telegram-secondaryBg text-telegram-hint hover:text-telegram-text transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div
                className="pt-8 pb-6 px-6 text-center"
                style={{
                  background: `linear-gradient(135deg, ${TIER_COLORS[requiredTier]}15, ${TIER_COLORS[requiredTier]}30)`,
                }}
              >
                <motion.div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: `${TIER_COLORS[requiredTier]}25` }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                >
                  <Crown className="w-8 h-8" style={{ color: TIER_COLORS[requiredTier] }} />
                </motion.div>
                <h2 className="text-xl font-bold text-telegram-text">{t('premium.upgradeTitle')}</h2>
                {featureName && (
                  <p className="text-sm text-telegram-hint mt-1">
                    {t('premium.featureLocked', { feature: featureName })}
                  </p>
                )}
              </div>

              {/* Tier comparison */}
              <div className="px-6 pt-4 pb-2 space-y-2">
                {/* Subscriber tier */}
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                    requiredTier === 'subscriber'
                      ? 'border-blue-500/40 bg-blue-500/10'
                      : 'border-telegram-hint/15 bg-telegram-secondaryBg'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/20 flex-shrink-0">
                    <Users className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-telegram-text">
                        {TIER_LABELS.subscriber}
                      </span>
                      {requiredTier === 'subscriber' && (
                        <span className="text-[10px] font-bold text-white bg-blue-500 px-1.5 py-0.5 rounded-full">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-telegram-hint">
                      {t('premium.subscriberDesc', { modes: TIER_FEATURES.subscriber.modes })}
                    </p>
                  </div>
                </div>

                {/* Premium tier */}
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                    requiredTier === 'premium'
                      ? 'border-amber-500/40 bg-amber-500/10'
                      : 'border-telegram-hint/15 bg-telegram-secondaryBg'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/20 flex-shrink-0">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-telegram-text">
                        {TIER_LABELS.premium}
                      </span>
                      {requiredTier === 'premium' && (
                        <span className="text-[10px] font-bold text-white bg-amber-500 px-1.5 py-0.5 rounded-full">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-telegram-hint">
                      {t('premium.premiumDesc', { modes: TIER_FEATURES.premium.modes })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 pt-4 space-y-2">
                <button
                  onClick={handleUpgrade}
                  className="w-full py-3 rounded-2xl text-sm font-semibold text-white transition-transform active:scale-[0.98]"
                  style={{
                    background: `linear-gradient(135deg, ${TIER_COLORS[requiredTier]}, ${requiredTier === 'premium' ? '#F97316' : '#2563EB'})`,
                  }}
                >
                  {t('premium.upgrade')}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2.5 rounded-2xl text-sm font-medium text-telegram-hint hover:text-telegram-text transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
