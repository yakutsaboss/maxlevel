// Subscription & payment types

export type SubscriptionTier = 'free' | 'subscriber' | 'premium';

export interface Subscription {
  subscription_id?: number;
  tier: SubscriptionTier;
  raw_tier?: SubscriptionTier;
  is_active: boolean;
  is_expired: boolean;
  started_at?: string;
  expires_at?: string | null;
  auto_renew?: boolean;
  updated_at?: string;
}

export interface ChannelStatus {
  is_subscribed: boolean;
  channel_username: string;
  checked_at: string | null;
  telegram_status?: string;
}

export interface TierInfo {
  tier: SubscriptionTier;
  name: string;
  mode_limit: number;
  price: number | null;
  currency?: string;
  purchasable: boolean;
  channel_required: boolean;
}

export interface PaymentHistoryEntry {
  id: number;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: string;
  telegram_payment_charge_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
