import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Crown, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { useSubscription } from '@/hooks/useSubscription';
import { usePayment } from '@/hooks/usePayment';
import { TierCard } from '@/components/subscription/TierCard';
import { useToastContext } from '@/contexts/ToastContext';
import { TIER_ORDER, CHANNEL_USERNAME } from '@/constants/tiers';
import type { SubscriptionTier } from '@/types';

function SubscriptionSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading subscription">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="skeleton w-8 h-8 rounded-lg mb-4" />
        <div className="skeleton h-7 w-40 rounded-lg mb-2" />
        <div className="skeleton h-4 w-60 rounded-lg" />
      </div>
      <div className="px-4 mt-4 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div>
                <div className="skeleton h-4 w-24 rounded mb-1" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
            </div>
            <div className="space-y-1.5 mb-3">
              {[0, 1, 2].map((j) => <div key={j} className="skeleton h-3 w-36 rounded" />)}
            </div>
            <div className="skeleton h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Subscription() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, haptic, openTelegramLink } = useTelegram();
  const { showToast } = useToastContext();

  const [upgradingTier, setUpgradingTier] = useState<SubscriptionTier | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const {
    loading,
    tiers,
    effectiveTier,
    isPremium,
    isSubscriber,
    reload,
    refreshChannel,
    refreshingChannel,
  } = useSubscription({ userId: user?.id });

  const handlePaymentSuccess = useCallback(() => {
    haptic.notification('success');
    setShowSuccess(true);
    reload();
    setTimeout(() => setShowSuccess(false), 4000);
  }, [haptic, reload]);

  const handlePaymentError = useCallback((error: string) => {
    haptic.notification('error');
    if (error !== 'Payment cancelled') {
      showToast(error, 'error');
    }
  }, [haptic, showToast]);

  const { initiatePayment, isLoading: paymentLoading } = usePayment({
    userId: user?.id,
    onSuccess: handlePaymentSuccess,
    onError: handlePaymentError,
  });

  const handleUpgrade = useCallback(async (tier: SubscriptionTier) => {
    if (tier === 'subscriber') {
      // Channel subscription — open Telegram channel
      haptic.impact('medium');
      openTelegramLink(`https://t.me/${CHANNEL_USERNAME}`);
      // After returning, let them refresh
      return;
    }

    if (tier === 'premium') {
      haptic.impact('medium');
      setUpgradingTier('premium');
      try {
        await initiatePayment('premium', 599);
      } finally {
        setUpgradingTier(null);
      }
    }
  }, [haptic, openTelegramLink, initiatePayment]);

  if (loading) return <SubscriptionSkeleton />;

  // Sort tiers by tier order
  const sortedTiers = [...tiers].sort(
    (a, b) => TIER_ORDER.indexOf(a.tier as SubscriptionTier) - TIER_ORDER.indexOf(b.tier as SubscriptionTier)
  );

  return (
    <div className="min-h-screen bg-telegram-bg pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-1.5 text-white/80 hover:text-white transition-colors"
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t('common.back')}</span>
        </button>

        <div className="flex items-center gap-3 mb-1">
          <Crown className="w-7 h-7 text-white" />
          <h1 className="text-xl font-bold text-white">{t('subscription.pageTitle')}</h1>
        </div>
        <p className="text-white/70 text-sm">{t('subscription.pageSubtitle')}</p>

        {/* Current plan badge */}
        <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="text-xs text-white/80">{t('subscription.currentPlan')}:</span>
          <span className="text-xs font-semibold text-white">
            {t(`settings.subscription.tier_${effectiveTier}`)}
          </span>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Success banner */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-500">{t('subscription.upgradeSuccess')}</p>
                <p className="text-xs text-telegram-hint mt-0.5">{t('settings.subscription.paymentSuccess')}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Already premium — channel refresh offer */}
        {isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3"
          >
            <Sparkles className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-telegram-hint">{t('subscription.premiumActiveNote')}</p>
          </motion.div>
        )}

        {/* Already subscriber — channel refresh offer */}
        {isSubscriber && !isPremium && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4"
          >
            <p className="text-xs text-telegram-hint mb-2">{t('settings.subscription.channelActive')}</p>
            <button
              onClick={refreshChannel}
              disabled={refreshingChannel}
              className="text-xs text-telegram-link font-medium flex items-center gap-1 disabled:opacity-50"
            >
              {t('settings.subscription.checkStatus')}
            </button>
          </motion.div>
        )}

        {/* Tier cards */}
        {sortedTiers.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-telegram-text px-0.5">{t('subscription.choosePlan')}</h2>
            {sortedTiers.map((tier) => (
              <TierCard
                key={tier.tier}
                tier={tier}
                isCurrent={tier.tier === effectiveTier}
                isUpgrading={upgradingTier === tier.tier || (paymentLoading && tier.tier === 'premium')}
                onUpgrade={
                  tier.tier !== effectiveTier && TIER_ORDER.indexOf(tier.tier as SubscriptionTier) > TIER_ORDER.indexOf(effectiveTier)
                    ? () => handleUpgrade(tier.tier as SubscriptionTier)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          /* Fallback if tiers API not ready yet (Agent A may not be merged) */
          <div className="bg-telegram-secondaryBg rounded-2xl p-6 border border-telegram-hint/10 text-center">
            <AlertCircle className="w-8 h-8 text-telegram-hint mx-auto mb-2" />
            <p className="text-sm text-telegram-hint">{t('subscription.tiersUnavailable')}</p>
          </div>
        )}

        {/* Info footer */}
        <p className="text-[10px] text-telegram-hint text-center px-4 pb-2">
          {t('subscription.billingNote')}
        </p>
      </div>
    </div>
  );
}
