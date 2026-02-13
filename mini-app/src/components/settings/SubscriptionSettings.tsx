import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Crown, Users, Star, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { MODE_LIMITS } from '@/constants/tiers';
import { usePayment } from '@/hooks/usePayment';
import type { SubscriptionTier } from '@/types';

const TIER_BADGE_STYLES: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500',
  subscriber: 'bg-blue-500',
  premium: 'bg-amber-500',
};

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

export function SubscriptionSettings() {
  const { t } = useTranslation();
  const { user, openTelegramLink, haptic } = useTelegram();
  const telegramId = user?.id;

  const [tier, setTier] = useState<SubscriptionTier>('free');
  const [modeCount, setModeCount] = useState(0);
  const [channelSubscribed, setChannelSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [internalUserId, setInternalUserId] = useState<number | undefined>(undefined);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const modeLimit = MODE_LIMITS[tier];

  const { initiatePayment, isLoading: paymentLoading, error: paymentError } = usePayment({
    userId: internalUserId,
    onSuccess: (result) => {
      haptic.notification('success');
      setPaymentSuccess(true);
      if (result.tier && result.tier in MODE_LIMITS) {
        setTier(result.tier as SubscriptionTier);
      }
      setTimeout(() => setPaymentSuccess(false), 5000);
    },
    onError: () => {
      haptic.notification('error');
    },
  });

  const fetchData = useCallback(async () => {
    if (!telegramId) return;

    try {
      // Fetch user stats (existing endpoint) for mode count + internal userId
      const stats = await apiClient.getUserStats(telegramId);
      setModeCount(stats.data?.modes?.length ?? 0);
      if (stats.data?.user?.id) {
        setInternalUserId(stats.data.user.id);
      }

      // Fetch channel subscription status (Agent B endpoint)
      try {
        const userId = stats.data?.user?.id;
        if (userId) {
          const channelRes = await fetch(`/api/channel/${userId}/status`, {
            headers: getAuthHeaders(),
          });
          if (channelRes.ok) {
            const channelData = await channelRes.json();
            if (channelData.success) {
              setChannelSubscribed(channelData.data?.isMember ?? false);
              // The channel endpoint auto-sets tier, so use the effective tier
              const effectiveTier = channelData.data?.effectiveTier;
              if (effectiveTier && effectiveTier in MODE_LIMITS) {
                setTier(effectiveTier as SubscriptionTier);
              }
            }
          }
        }
      } catch {
        // Channel endpoint may not exist yet — degrade gracefully
      }
    } catch {
      // Stats fetch failed — keep defaults
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshChannel = useCallback(async () => {
    if (!telegramId || refreshing) return;
    haptic.impact('light');
    setRefreshing(true);

    try {
      // Get userId from stats first
      const stats = await apiClient.getUserStats(telegramId);
      const userId = stats.data?.user?.id;
      if (!userId) return;

      const res = await fetch(`/api/channel/${userId}/refresh`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setChannelSubscribed(data.data?.isMember ?? false);
          const effectiveTier = data.data?.effectiveTier;
          if (effectiveTier && effectiveTier in MODE_LIMITS) {
            setTier(effectiveTier as SubscriptionTier);
          }
        }
      }
    } catch {
      // Ignore — refresh failed silently
    } finally {
      setRefreshing(false);
    }
  }, [telegramId, refreshing, haptic]);

  const handleSubscribeChannel = useCallback(() => {
    haptic.impact('medium');
    openTelegramLink('https://t.me/yakutsaway');
  }, [haptic, openTelegramLink]);

  if (!telegramId) return null;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
      >
        <div className="flex items-center justify-center gap-2 py-4 text-telegram-hint">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">{t('common.loading')}</span>
        </div>
      </motion.div>
    );
  }

  const usagePercent = modeLimit > 0 ? Math.min((modeCount / modeLimit) * 100, 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 space-y-4"
    >
      {/* Tier Badge + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${TIER_BADGE_STYLES[tier]} w-10 h-10 rounded-xl flex items-center justify-center text-white`}>
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('settings.subscription.title')}</h3>
            <span className={`inline-block mt-0.5 text-xs font-medium px-2 py-0.5 rounded-full text-white ${TIER_BADGE_STYLES[tier]}`}>
              {t(`settings.subscription.tier_${tier}`)}
            </span>
          </div>
        </div>
      </div>

      {/* Mode Usage Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-telegram-hint">{t('settings.subscription.modesUsed')}</span>
          <span className="text-xs font-medium">
            {modeCount} / {modeLimit}
          </span>
        </div>
        <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${usagePercent >= 100 ? 'bg-red-500' : 'bg-telegram-link'}`}
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
        {modeCount >= modeLimit && (
          <p className="text-[10px] text-red-400 mt-1">{t('settings.subscription.limitReached')}</p>
        )}
      </div>

      {/* Channel Subscribe CTA */}
      {!channelSubscribed && tier !== 'premium' && (
        <div className="bg-telegram-bg rounded-xl p-3 border border-telegram-hint/10">
          <div className="flex items-start gap-3">
            <div className="bg-blue-500/10 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t('settings.subscription.channelCta')}</p>
              <p className="text-xs text-telegram-hint mt-0.5">{t('settings.subscription.channelCtaDesc')}</p>
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={handleSubscribeChannel}
                  className="text-xs font-semibold text-white bg-blue-500 px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
                >
                  {t('settings.subscription.subscribe')}
                </button>
                <button
                  onClick={handleRefreshChannel}
                  disabled={refreshing}
                  className="text-xs font-medium text-telegram-link px-2 py-1.5 rounded-lg active:scale-95 transition-transform disabled:opacity-50 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  {t('settings.subscription.checkStatus')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel subscribed confirmation */}
      {channelSubscribed && tier === 'subscriber' && (
        <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-blue-500">{t('settings.subscription.channelActive')}</span>
          </div>
        </div>
      )}

      {/* Payment Success */}
      {paymentSuccess && (
        <div className="bg-green-500/10 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs font-medium text-green-500">{t('settings.subscription.paymentSuccess')}</span>
          </div>
        </div>
      )}

      {/* Payment Error */}
      {paymentError && !paymentSuccess && (
        <div className="bg-red-500/10 rounded-xl p-3 border border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-medium text-red-400">{paymentError}</span>
          </div>
        </div>
      )}

      {/* Premium Upgrade CTA */}
      {tier !== 'premium' && (
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-3 border border-amber-500/20">
          <div className="flex items-start gap-3">
            <div className="bg-amber-500/20 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <Star className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{t('settings.subscription.premiumCta')}</p>
              <p className="text-xs text-telegram-hint mt-0.5">{t('settings.subscription.premiumCtaDesc')}</p>
              <button
                onClick={() => {
                  haptic.impact('medium');
                  initiatePayment('premium', 599);
                }}
                disabled={paymentLoading}
                className="mt-2 text-xs font-semibold text-white bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 rounded-lg active:scale-95 transition-transform flex items-center gap-1 disabled:opacity-50"
              >
                {paymentLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Star className="w-3 h-3" />
                )}
                {paymentLoading
                  ? t('settings.subscription.processing')
                  : t('settings.subscription.upgradePremium')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
