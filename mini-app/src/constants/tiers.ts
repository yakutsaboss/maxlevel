import type { SubscriptionTier } from '@/types';

export const MODE_LIMITS: Record<SubscriptionTier, number> = {
  free: 2,
  subscriber: 3,
  premium: 6,
};

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  subscriber: 'Subscriber',
  premium: 'Premium',
};

export const TIER_COLORS: Record<SubscriptionTier, string> = {
  free: '#6B7280',
  subscriber: '#3B82F6',
  premium: '#F59E0B',
};

export const TIER_ORDER: SubscriptionTier[] = ['free', 'subscriber', 'premium'];

export const CHANNEL_USERNAME = 'yakutsaway';
