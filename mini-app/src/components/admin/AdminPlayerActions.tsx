import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Award,
  Trophy,
  ArrowUpDown,
  Send,
  UserX,
  X,
  Loader2,
  Search,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { FocusTrap } from '@/components/FocusTrap';
import { Toast } from '@/components/Toast';
import { adminFetch } from '@/api/adminClient';
import { apiClient } from '@/api/client';
import { useTelegram } from '@/hooks/useTelegram';
import type { Achievement } from '@/types';

interface AdminPlayerActionsProps {
  userId: number;
  currentTier: string;
  currentXp: number;
  onActionComplete: () => void;
}

type ModalType = 'award-xp' | 'unlock-achievement' | 'change-tier' | 'send-message' | 'deactivate' | null;

interface ToastState {
  message: string;
  variant: 'success' | 'error' | 'info';
}

// ---- Modal Backdrop + Sheet ----

function ModalShell({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
          onClick={onClose}
        >
          <FocusTrap onEscape={onClose}>
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-telegram-text">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-telegram-bg active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5 text-telegram-hint" />
                </button>
              </div>
              {children}
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---- Main Component ----

export function AdminPlayerActions({
  userId,
  currentTier,
  currentXp,
  onActionComplete,
}: AdminPlayerActionsProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();

  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Award XP state
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');

  // Unlock Achievement state
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievementIds, setUserAchievementIds] = useState<Set<number>>(new Set());
  const [achievementSearch, setAchievementSearch] = useState('');
  const [selectedAchievementId, setSelectedAchievementId] = useState<number | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(false);

  // Change Tier state
  const [selectedTier, setSelectedTier] = useState(currentTier);

  // Send Message state
  const [messageText, setMessageText] = useState('');

  const credentials = sessionStorage.getItem('admin_credentials') || '';

  const openModal = useCallback((type: ModalType) => {
    haptic.impact('medium');
    setActiveModal(type);
    // Reset states per modal
    if (type === 'award-xp') {
      setXpAmount('');
      setXpReason('');
    } else if (type === 'change-tier') {
      setSelectedTier(currentTier);
    } else if (type === 'send-message') {
      setMessageText('');
    } else if (type === 'unlock-achievement') {
      setAchievementSearch('');
      setSelectedAchievementId(null);
    }
  }, [haptic, currentTier]);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Load achievements when that modal opens
  useEffect(() => {
    if (activeModal !== 'unlock-achievement') return;

    let cancelled = false;
    setAchievementsLoading(true);

    Promise.all([
      apiClient.getAchievements(),
      apiClient.getUserAchievements(userId),
    ])
      .then(([allRes, userRes]) => {
        if (cancelled) return;
        setAchievements(allRes.data ?? []);
        setUserAchievementIds(
          new Set((userRes.data ?? []).map((ua) => ua.achievement_id))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setToast({ message: t('admin.actions.error', 'Failed to load achievements'), variant: 'error' });
        }
      })
      .finally(() => {
        if (!cancelled) setAchievementsLoading(false);
      });

    return () => { cancelled = true; };
  }, [activeModal, userId, t]);

  // ---- Action Handlers ----

  const handleAwardXp = async () => {
    const amount = parseInt(xpAmount, 10);
    if (!amount || amount <= 0) return;

    haptic.impact('medium');
    setLoading(true);
    try {
      const res = await adminFetch(`/players/${userId}/award-xp`, credentials, {
        method: 'POST',
        body: JSON.stringify({ amount, reason: xpReason.trim() || undefined }),
      });

      if (res.ok) {
        haptic.notification('success');
        setToast({
          message: t('admin.actions.xpAwarded', `Awarded ${amount} XP`),
          variant: 'success',
        });
        closeModal();
        onActionComplete();
      } else {
        haptic.notification('error');
        const data = await res.json().catch(() => ({}));
        setToast({
          message: (data as Record<string, string>).error || t('admin.actions.error', 'Action failed'),
          variant: 'error',
        });
      }
    } catch {
      haptic.notification('error');
      setToast({ message: t('admin.actions.error', 'Connection failed'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleUnlockAchievement = async () => {
    if (!selectedAchievementId) return;

    haptic.impact('medium');
    setLoading(true);
    try {
      const res = await adminFetch(`/players/${userId}/unlock-achievement`, credentials, {
        method: 'POST',
        body: JSON.stringify({ achievement_id: selectedAchievementId }),
      });

      if (res.ok) {
        haptic.notification('success');
        const ach = achievements.find((a) => a.id === selectedAchievementId);
        setToast({
          message: t('admin.actions.achievementUnlocked', `Unlocked: ${ach?.name || 'Achievement'}`),
          variant: 'success',
        });
        closeModal();
        onActionComplete();
      } else {
        haptic.notification('error');
        const data = await res.json().catch(() => ({}));
        setToast({
          message: (data as Record<string, string>).error || t('admin.actions.error', 'Action failed'),
          variant: 'error',
        });
      }
    } catch {
      haptic.notification('error');
      setToast({ message: t('admin.actions.error', 'Connection failed'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangeTier = async () => {
    if (selectedTier === currentTier) return;

    haptic.impact('medium');
    setLoading(true);
    try {
      const res = await adminFetch(`/players/${userId}/tier`, credentials, {
        method: 'PATCH',
        body: JSON.stringify({ tier: selectedTier }),
      });

      if (res.ok) {
        haptic.notification('success');
        setToast({
          message: t('admin.actions.tierChanged', `Tier changed to ${selectedTier}`),
          variant: 'success',
        });
        closeModal();
        onActionComplete();
      } else {
        haptic.notification('error');
        const data = await res.json().catch(() => ({}));
        setToast({
          message: (data as Record<string, string>).error || t('admin.actions.error', 'Action failed'),
          variant: 'error',
        });
      }
    } catch {
      haptic.notification('error');
      setToast({ message: t('admin.actions.error', 'Connection failed'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;

    haptic.impact('medium');
    setLoading(true);
    try {
      const res = await adminFetch(`/players/${userId}/message`, credentials, {
        method: 'POST',
        body: JSON.stringify({ text: messageText.trim() }),
      });

      if (res.ok) {
        haptic.notification('success');
        setToast({
          message: t('admin.actions.messageSent', 'Message sent'),
          variant: 'success',
        });
        closeModal();
        onActionComplete();
      } else {
        haptic.notification('error');
        const data = await res.json().catch(() => ({}));
        setToast({
          message: (data as Record<string, string>).error || t('admin.actions.error', 'Action failed'),
          variant: 'error',
        });
      }
    } catch {
      haptic.notification('error');
      setToast({ message: t('admin.actions.error', 'Connection failed'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async () => {
    haptic.impact('heavy');
    setLoading(true);
    try {
      const res = await adminFetch(`/users/${userId}/deactivate`, credentials, {
        method: 'POST',
      });

      if (res.ok) {
        haptic.notification('success');
        setToast({
          message: t('admin.actions.accountDeactivated', 'Account deactivated'),
          variant: 'success',
        });
        closeModal();
        onActionComplete();
      } else {
        haptic.notification('error');
        const data = await res.json().catch(() => ({}));
        setToast({
          message: (data as Record<string, string>).error || t('admin.actions.error', 'Action failed'),
          variant: 'error',
        });
      }
    } catch {
      haptic.notification('error');
      setToast({ message: t('admin.actions.error', 'Connection failed'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Filter achievements by search
  const filteredAchievements = achievements.filter((a) =>
    a.name.toLowerCase().includes(achievementSearch.toLowerCase()) ||
    a.description.toLowerCase().includes(achievementSearch.toLowerCase())
  );

  const TIERS = ['free', 'subscriber', 'premium'] as const;
  const isDowngrade = TIERS.indexOf(selectedTier as typeof TIERS[number]) < TIERS.indexOf(currentTier as typeof TIERS[number]);

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <ActionButton
          icon={<Award className="w-5 h-5" />}
          label={t('admin.actions.awardXp', 'Award XP')}
          onClick={() => openModal('award-xp')}
          color="bg-blue-500/10 text-blue-500 border-blue-500/20"
        />
        <ActionButton
          icon={<Trophy className="w-5 h-5" />}
          label={t('admin.actions.unlockAchievement', 'Unlock Achievement')}
          onClick={() => openModal('unlock-achievement')}
          color="bg-amber-500/10 text-amber-500 border-amber-500/20"
        />
        <ActionButton
          icon={<ArrowUpDown className="w-5 h-5" />}
          label={t('admin.actions.changeTier', 'Change Tier')}
          onClick={() => openModal('change-tier')}
          color="bg-purple-500/10 text-purple-500 border-purple-500/20"
        />
        <ActionButton
          icon={<Send className="w-5 h-5" />}
          label={t('admin.actions.sendMessage', 'Send Message')}
          onClick={() => openModal('send-message')}
          color="bg-green-500/10 text-green-500 border-green-500/20"
        />
      </div>

      {/* Danger zone */}
      <div className="border border-red-500/20 rounded-xl p-4">
        <p className="text-xs text-red-400 font-medium uppercase tracking-wide mb-3">
          {t('admin.actions.dangerZone', 'Danger Zone')}
        </p>
        <ActionButton
          icon={<UserX className="w-5 h-5" />}
          label={t('admin.actions.deactivateAccount', 'Deactivate Account')}
          onClick={() => openModal('deactivate')}
          color="bg-red-500/10 text-red-500 border-red-500/20"
          fullWidth
        />
      </div>

      {/* ---- MODALS ---- */}

      {/* Award XP Modal */}
      <ModalShell
        isOpen={activeModal === 'award-xp'}
        onClose={closeModal}
        title={t('admin.actions.awardXp', 'Award XP')}
      >
        <div className="space-y-4">
          <p className="text-sm text-telegram-hint">
            {t('admin.actions.currentXp', 'Current XP')}: <span className="text-telegram-text font-semibold">{currentXp.toLocaleString()}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              {t('admin.actions.amount', 'Amount')} *
            </label>
            <input
              type="number"
              min="1"
              value={xpAmount}
              onChange={(e) => setXpAmount(e.target.value)}
              placeholder="100"
              className="w-full px-4 py-3 rounded-xl bg-telegram-bg text-telegram-text border border-telegram-hint/20 focus:border-telegram-button focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              {t('admin.actions.reason', 'Reason')}
            </label>
            <input
              type="text"
              value={xpReason}
              onChange={(e) => setXpReason(e.target.value)}
              placeholder={t('admin.actions.reasonPlaceholder', 'e.g., Bug bounty reward')}
              className="w-full px-4 py-3 rounded-xl bg-telegram-bg text-telegram-text border border-telegram-hint/20 focus:border-telegram-button focus:outline-none"
            />
          </div>

          <button
            onClick={handleAwardXp}
            disabled={loading || !xpAmount || parseInt(xpAmount, 10) <= 0}
            className="w-full py-3 rounded-xl bg-telegram-button text-telegram-buttonText font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('admin.actions.confirm', 'Confirm')}
          </button>
        </div>
      </ModalShell>

      {/* Unlock Achievement Modal */}
      <ModalShell
        isOpen={activeModal === 'unlock-achievement'}
        onClose={closeModal}
        title={t('admin.actions.unlockAchievement', 'Unlock Achievement')}
      >
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-telegram-hint" />
            <input
              type="text"
              value={achievementSearch}
              onChange={(e) => setAchievementSearch(e.target.value)}
              placeholder={t('admin.actions.searchAchievements', 'Search achievements...')}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-telegram-bg text-telegram-text border border-telegram-hint/20 focus:border-telegram-button focus:outline-none"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1">
            {achievementsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" />
              </div>
            ) : filteredAchievements.length === 0 ? (
              <p className="text-center text-telegram-hint py-4 text-sm">
                {t('admin.actions.noAchievements', 'No achievements found')}
              </p>
            ) : (
              filteredAchievements.map((ach) => {
                const isUnlocked = userAchievementIds.has(ach.id);
                const isSelected = selectedAchievementId === ach.id;

                return (
                  <button
                    key={ach.id}
                    onClick={() => {
                      if (!isUnlocked) {
                        haptic.selection();
                        setSelectedAchievementId(isSelected ? null : ach.id);
                      }
                    }}
                    disabled={isUnlocked}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors flex items-center gap-3 ${
                      isUnlocked
                        ? 'opacity-40 cursor-not-allowed'
                        : isSelected
                        ? 'bg-telegram-button/10 border border-telegram-button/30'
                        : 'hover:bg-telegram-bg border border-transparent'
                    }`}
                  >
                    <span className="text-xl flex-shrink-0">{ach.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-telegram-text truncate">{ach.name}</p>
                      <p className="text-xs text-telegram-hint truncate">{ach.description}</p>
                    </div>
                    {isUnlocked && (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex-shrink-0">
                        {t('admin.actions.unlocked', 'Unlocked')}
                      </span>
                    )}
                    {isSelected && !isUnlocked && (
                      <Check className="w-5 h-5 text-telegram-button flex-shrink-0" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          <button
            onClick={handleUnlockAchievement}
            disabled={loading || !selectedAchievementId}
            className="w-full py-3 rounded-xl bg-telegram-button text-telegram-buttonText font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trophy className="w-5 h-5" />}
            {t('admin.actions.confirm', 'Confirm')}
          </button>
        </div>
      </ModalShell>

      {/* Change Tier Modal */}
      <ModalShell
        isOpen={activeModal === 'change-tier'}
        onClose={closeModal}
        title={t('admin.actions.changeTier', 'Change Tier')}
      >
        <div className="space-y-4">
          <p className="text-sm text-telegram-hint">
            {t('admin.actions.currentTier', 'Current tier')}:{' '}
            <span className="text-telegram-text font-semibold capitalize">{currentTier}</span>
          </p>

          <div className="space-y-2">
            {TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => {
                  haptic.selection();
                  setSelectedTier(tier);
                }}
                className={`w-full text-left px-4 py-3 rounded-xl transition-colors flex items-center justify-between ${
                  selectedTier === tier
                    ? 'bg-telegram-button/10 border border-telegram-button/30'
                    : 'bg-telegram-bg border border-transparent hover:border-telegram-hint/20'
                }`}
              >
                <span className="text-sm font-medium text-telegram-text capitalize">{tier}</span>
                {selectedTier === tier && <Check className="w-5 h-5 text-telegram-button" />}
                {tier === currentTier && (
                  <span className="text-xs text-telegram-hint ml-2">
                    ({t('admin.actions.current', 'current')})
                  </span>
                )}
              </button>
            ))}
          </div>

          {isDowngrade && (
            <div className="flex items-start gap-2 bg-amber-500/10 rounded-xl p-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                {t('admin.actions.downgradeWarning', 'Warning: Downgrading may remove access to premium features.')}
              </p>
            </div>
          )}

          <button
            onClick={handleChangeTier}
            disabled={loading || selectedTier === currentTier}
            className="w-full py-3 rounded-xl bg-telegram-button text-telegram-buttonText font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('admin.actions.confirm', 'Confirm')}
          </button>
        </div>
      </ModalShell>

      {/* Send Message Modal */}
      <ModalShell
        isOpen={activeModal === 'send-message'}
        onClose={closeModal}
        title={t('admin.actions.sendMessage', 'Send Message')}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-telegram-text mb-1">
              {t('admin.actions.messageLabel', 'Message')} *
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t('admin.actions.messagePlaceholder', 'Type your message...')}
              rows={4}
              maxLength={4096}
              className="w-full px-4 py-3 rounded-xl bg-telegram-bg text-telegram-text border border-telegram-hint/20 focus:border-telegram-button focus:outline-none resize-none"
            />
            <p className="text-xs text-telegram-hint mt-1 text-right">
              {messageText.length}/4096
            </p>
          </div>

          <button
            onClick={handleSendMessage}
            disabled={loading || !messageText.trim()}
            className="w-full py-3 rounded-xl bg-telegram-button text-telegram-buttonText font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {t('admin.actions.sendBtn', 'Send')}
          </button>
        </div>
      </ModalShell>

      {/* Deactivate Account Modal */}
      <ModalShell
        isOpen={activeModal === 'deactivate'}
        onClose={closeModal}
        title={t('admin.actions.deactivateAccount', 'Deactivate Account')}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-red-500/10 rounded-xl p-4">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-400">
                {t('admin.actions.deactivateWarningTitle', 'Are you sure?')}
              </p>
              <p className="text-xs text-red-400/80 mt-1">
                {t(
                  'admin.actions.deactivateWarningBody',
                  "This will deactivate the user's account. They will no longer be able to access the app until reactivated."
                )}
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={closeModal}
              className="flex-1 py-3 rounded-xl bg-telegram-bg text-telegram-text font-semibold border border-telegram-hint/20 active:scale-[0.98] transition-transform"
            >
              {t('admin.actions.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleDeactivate}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserX className="w-5 h-5" />}
              {t('admin.actions.deactivateConfirm', 'Deactivate')}
            </button>
          </div>
        </div>
      </ModalShell>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}

// ---- Action Button ----

function ActionButton({
  icon,
  label,
  onClick,
  color,
  fullWidth = false,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color: string;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`${fullWidth ? 'w-full' : ''} flex items-center gap-2 px-4 py-3 rounded-xl border ${color} font-medium text-sm active:scale-[0.97] transition-transform`}
    >
      {icon}
      {label}
    </button>
  );
}
