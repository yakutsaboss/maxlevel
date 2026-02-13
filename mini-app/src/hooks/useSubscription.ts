import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/api/client';
import { getErrorMessage } from '@/hooks/useApiError';
import { MODE_LIMITS } from '@/constants/tiers';
import type { Subscription, ChannelStatus, TierInfo, SubscriptionTier } from '@/types';
import { logger } from '@/utils/logger';

interface UseSubscriptionParams {
  userId: number | undefined;
}

interface UseSubscriptionReturn {
  loading: boolean;
  error: string | null;
  subscription: Subscription | null;
  channelStatus: ChannelStatus | null;
  tiers: TierInfo[];
  effectiveTier: SubscriptionTier;
  modeLimit: number;
  isSubscriber: boolean;
  isPremium: boolean;
  refreshChannel: () => Promise<void>;
  refreshingChannel: boolean;
  reload: () => void;
}

export function useSubscription({ userId }: UseSubscriptionParams): UseSubscriptionReturn {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [channelStatus, setChannelStatus] = useState<ChannelStatus | null>(null);
  const [tiers, setTiers] = useState<TierInfo[]>([]);
  const [refreshingChannel, setRefreshingChannel] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    try {
      setLoading(true);
      setError(null);

      const [subRes, channelRes, tiersRes] = await Promise.all([
        apiClient.getSubscription(userId, { signal }),
        apiClient.getChannelStatus(userId, { signal }).catch(() => null),
        apiClient.getTiers({ signal }).catch(() => null),
      ]);

      if (signal.aborted) return;

      if (subRes.success && subRes.data) {
        setSubscription(subRes.data);
      }
      if (channelRes?.success && channelRes.data) {
        setChannelStatus(channelRes.data);
      }
      if (tiersRes?.success && tiersRes.data) {
        setTiers(tiersRes.data);
      }
    } catch (err) {
      if (signal.aborted) return;
      logger.error('Failed to load subscription data', { error: err });
      setError(getErrorMessage(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
    return () => { abortRef.current?.abort(); };
  }, [loadData]);

  const refreshChannel = useCallback(async () => {
    if (!userId || refreshingChannel) return;
    setRefreshingChannel(true);
    try {
      const res = await apiClient.refreshChannelStatus(userId);
      if (res.success && res.data) {
        setChannelStatus(res.data);
      }
      // Reload subscription since tier may have changed
      const subRes = await apiClient.getSubscription(userId);
      if (subRes.success && subRes.data) {
        setSubscription(subRes.data);
      }
    } catch (err) {
      logger.error('Failed to refresh channel status', { error: err });
    } finally {
      setRefreshingChannel(false);
    }
  }, [userId, refreshingChannel]);

  // Compute effective tier from subscription data
  const effectiveTier: SubscriptionTier = (subscription?.tier as SubscriptionTier) || 'free';
  const modeLimit = MODE_LIMITS[effectiveTier] ?? MODE_LIMITS.free;
  const isSubscriber = effectiveTier === 'subscriber' || effectiveTier === 'premium';
  const isPremium = effectiveTier === 'premium';

  return {
    loading,
    error,
    subscription,
    channelStatus,
    tiers,
    effectiveTier,
    modeLimit,
    isSubscriber,
    isPremium,
    refreshChannel,
    refreshingChannel,
    reload: loadData,
  };
}
