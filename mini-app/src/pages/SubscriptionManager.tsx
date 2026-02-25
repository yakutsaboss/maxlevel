import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, ArrowLeft, ToggleLeft, ToggleRight, AlertTriangle, Loader2, CheckCircle2, Receipt } from 'lucide-react';
import { apiClient } from '@/api/client';
import { useTelegram } from '@/hooks/useTelegram';
import { BillingHistory } from '@/components/subscription/BillingHistory';
import type { Subscription, SubscriptionTier } from '@/types';

const TIER_STYLES: Record<SubscriptionTier, { badge: string; label: string }> = {
  free: { badge: 'bg-gray-500', label: 'Free' },
  subscriber: { badge: 'bg-blue-500', label: 'Subscriber' },
  premium: { badge: 'bg-amber-500', label: 'Premium' },
};

function getDaysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatExpiry(sub: Subscription): string {
  if (!sub.expires_at) return '';
  const days = getDaysUntil(sub.expires_at);
  if (days === null) return '';
  if (days > 0) return `Renews in ${days} day${days !== 1 ? 's' : ''}`;
  if (days === 0) return 'Expires today';
  return `Expired ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''} ago`;
}

function getStatusLabel(sub: Subscription): { text: string; color: string } {
  if (sub.is_expired) return { text: 'Expired', color: 'text-red-400' };
  if (!sub.is_active) return { text: 'Inactive', color: 'text-telegram-hint' };
  const days = getDaysUntil(sub.expires_at);
  if (days !== null && days <= 3 && days > 0) return { text: 'Expiring soon', color: 'text-amber-500' };
  return { text: 'Active', color: 'text-green-500' };
}

interface CancelModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

function CancelModal({ onConfirm, onCancel, loading }: CancelModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 pb-safe"
      onClick={onCancel}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-telegram-secondaryBg rounded-t-2xl p-6 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Cancel Subscription</h3>
            <p className="text-xs text-telegram-hint mt-0.5">You'll lose access at the end of your billing period</p>
          </div>
        </div>
        <p className="text-sm text-telegram-hint">
          Your premium features will remain active until your current period ends. You can resubscribe at any time.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-medium rounded-xl bg-telegram-bg text-telegram-text disabled:opacity-50"
          >
            Keep subscription
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl bg-red-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Cancelling...' : 'Cancel'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function SubscriptionManager() {
  const navigate = useNavigate();
  const { user, haptic } = useTelegram();
  const telegramId = user?.id;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchData = useCallback(async () => {
    if (!telegramId) return;
    try {
      const stats = await apiClient.getUserStats(telegramId);
      const userId = stats.data?.user?.id;
      if (userId) {
        setInternalUserId(userId);
        const subRes = await apiClient.getSubscription(userId);
        if (subRes.success && subRes.data) {
          setSubscription(subRes.data);
        }
      }
    } catch {
      // keep defaults
    } finally {
      setLoading(false);
    }
  }, [telegramId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleAutoRenew = async () => {
    if (!internalUserId || !subscription || autoRenewLoading) return;
    haptic.impact('light');
    const newValue = !subscription.auto_renew;
    setAutoRenewLoading(true);
    try {
      const res = await apiClient.toggleAutoRenew(internalUserId, newValue);
      if (res.success) {
        setSubscription(prev => prev ? { ...prev, auto_renew: newValue } : prev);
        showToast(newValue ? 'Auto-renew enabled' : 'Auto-renew disabled', 'success');
      }
    } catch {
      showToast('Failed to update auto-renew', 'error');
    } finally {
      setAutoRenewLoading(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!internalUserId) return;
    haptic.notification('warning');
    setCancelLoading(true);
    try {
      const res = await apiClient.cancelSubscription(internalUserId);
      if (res.success) {
        setShowCancelModal(false);
        setSubscription(prev => prev ? { ...prev, auto_renew: false } : prev);
        showToast('Subscription cancelled. Access continues until period ends.', 'success');
      }
    } catch {
      showToast('Failed to cancel subscription', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  if (!telegramId) return null;

  const tier = (subscription?.tier ?? 'free') as SubscriptionTier;
  const tierStyle = TIER_STYLES[tier];
  const expiryText = subscription ? formatExpiry(subscription) : '';
  const statusInfo = subscription ? getStatusLabel(subscription) : null;
  const isFree = tier === 'free';

  return (
    <div className="min-h-screen bg-telegram-bg">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-telegram-bg border-b border-telegram-hint/10 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { haptic.impact('light'); navigate(-1); }}
          className="w-8 h-8 rounded-full bg-telegram-secondaryBg flex items-center justify-center"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="font-semibold text-base">Manage Subscription</h1>
      </div>

      <div className="px-4 py-4 space-y-4 pb-safe">

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium ${
                toast.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-400'
              }`}
            >
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
              {toast.message}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-telegram-hint">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <>
            {/* Current Plan Card */}
            <div className="bg-telegram-secondaryBg rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className={`${tierStyle.badge} w-10 h-10 rounded-xl flex items-center justify-center text-white`}>
                  <Crown className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-sm">{tierStyle.label} Plan</h2>
                    {statusInfo && (
                      <span className={`text-xs font-medium ${statusInfo.color}`}>· {statusInfo.text}</span>
                    )}
                  </div>
                  {expiryText && (
                    <p className="text-xs text-telegram-hint mt-0.5">{expiryText}</p>
                  )}
                </div>
              </div>

              {/* Auto-renew toggle */}
              {!isFree && subscription?.is_active && !subscription?.is_expired && (
                <div className="flex items-center justify-between pt-2 border-t border-telegram-hint/10">
                  <div>
                    <p className="text-sm font-medium">Auto-renew</p>
                    <p className="text-xs text-telegram-hint">Automatically renew when subscription expires</p>
                  </div>
                  <button
                    onClick={handleToggleAutoRenew}
                    disabled={autoRenewLoading}
                    className="text-telegram-link disabled:opacity-50 flex items-center"
                  >
                    {autoRenewLoading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : subscription?.auto_renew ? (
                      <ToggleRight className="w-7 h-7 text-blue-500" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-telegram-hint" />
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="bg-telegram-secondaryBg rounded-2xl overflow-hidden divide-y divide-telegram-hint/10">
              {/* Upgrade / Compare tiers */}
              <button
                onClick={() => { haptic.impact('light'); navigate('/subscription'); }}
                className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-telegram-hint/5"
              >
                <span className="text-sm font-medium">{isFree ? 'View plans' : 'Change plan'}</span>
                <span className="text-xs text-telegram-hint">Compare tiers →</span>
              </button>

              {/* Cancel subscription */}
              {!isFree && subscription?.is_active && !subscription?.is_expired && (
                <button
                  onClick={() => { haptic.impact('medium'); setShowCancelModal(true); }}
                  className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-telegram-hint/5"
                >
                  <span className="text-sm font-medium text-red-400">Cancel subscription</span>
                  <span className="text-xs text-telegram-hint">Keep access until period ends</span>
                </button>
              )}
            </div>

            {/* Billing History */}
            {internalUserId && (
              <div className="bg-telegram-secondaryBg rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Receipt className="w-4 h-4 text-telegram-hint" />
                  <h3 className="font-semibold text-sm">Billing History</h3>
                </div>
                <BillingHistory userId={internalUserId} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Cancel modal */}
      <AnimatePresence>
        {showCancelModal && (
          <CancelModal
            onConfirm={handleCancelConfirm}
            onCancel={() => setShowCancelModal(false)}
            loading={cancelLoading}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
