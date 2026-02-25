import { Crown, Users, Star, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { Subscription, SubscriptionTier } from '@/types';

interface SubscriptionStatusProps {
  subscription: Subscription | null;
  effectiveTier: SubscriptionTier;
  isSubscriber: boolean;
  isPremium: boolean;
  refreshingChannel?: boolean;
  onRefresh?: () => void;
}

const TIER_BADGE_STYLES: Record<SubscriptionTier, string> = {
  free: 'bg-gray-500',
  subscriber: 'bg-blue-500',
  premium: 'bg-gradient-to-r from-amber-500 to-orange-500',
};

function TierIcon({ tier }: { tier: SubscriptionTier }) {
  if (tier === 'premium') return <Star className="w-4 h-4" />;
  if (tier === 'subscriber') return <Users className="w-4 h-4" />;
  return <Crown className="w-4 h-4" />;
}

function formatExpiry(date: string | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SubscriptionStatus({
  subscription,
  effectiveTier,
  isPremium,
  refreshingChannel,
  onRefresh,
}: SubscriptionStatusProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate('/subscription')}
      className="w-full text-left bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 hover:border-telegram-hint/20 active:scale-[0.99] transition-all"
      aria-label={t('subscription.manageSubscription')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Tier icon badge */}
          <div className={`${TIER_BADGE_STYLES[effectiveTier]} w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
            <TierIcon tier={effectiveTier} />
          </div>

          <div>
            <p className="text-xs text-telegram-hint">{t('subscription.currentPlan')}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-sm font-semibold text-telegram-text">
                {t(`settings.subscription.tier_${effectiveTier}`)}
              </span>
              {isPremium && subscription?.auto_renew && (
                <span className="text-[10px] text-emerald-500 font-medium bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  {t('subscription.autoRenew')}
                </span>
              )}
            </div>

            {/* Expiry date */}
            {isPremium && subscription?.expires_at && (
              <div className="flex items-center gap-1 mt-1">
                <Calendar className="w-3 h-3 text-telegram-hint" />
                <span className="text-[10px] text-telegram-hint">
                  {t('subscription.expiresOn', { date: formatExpiry(subscription.expires_at) })}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={refreshingChannel}
              className="p-1.5 rounded-lg text-telegram-hint hover:text-telegram-text transition-colors disabled:opacity-50"
              aria-label={t('subscription.refresh')}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingChannel ? 'animate-spin' : ''}`} />
            </button>
          )}
          <ChevronRight className="w-4 h-4 text-telegram-hint" />
        </div>
      </div>

      {/* Manage link hint */}
      <p className="text-[10px] text-telegram-hint mt-2">
        {t('subscription.manageSubscription')} →
      </p>
    </motion.button>
  );
}
