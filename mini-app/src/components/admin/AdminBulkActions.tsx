import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Award, Users, MessageSquare, Download, X, Loader2 } from 'lucide-react';
import { adminFetch } from '../../api/adminClient';
import { FocusTrap } from '../FocusTrap';
import { Toast } from '../Toast';

interface AdminBulkActionsProps {
  selectedUserIds: number[];
  credentials: string;
  onComplete: () => void;
  onClearSelection: () => void;
}

type ModalType = 'award-xp' | 'change-tier' | 'send-message' | null;

interface BulkResult {
  processed: number;
  succeeded: number;
  failed: number;
}

const toolbarVariants = {
  hidden: { y: 100, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: 100, opacity: 0, transition: { duration: 0.2 } },
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { y: 50, opacity: 0, scale: 0.95 },
  visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
  exit: { y: 50, opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export function AdminBulkActions({ selectedUserIds, credentials, onComplete, onClearSelection }: AdminBulkActionsProps) {
  const { t } = useTranslation();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  // Award XP state
  const [xpAmount, setXpAmount] = useState('');
  const [xpReason, setXpReason] = useState('');

  // Change tier state
  const [selectedTier, setSelectedTier] = useState<string>('subscriber');

  // Send message state
  const [messageText, setMessageText] = useState('');

  const count = selectedUserIds.length;

  const resetModalState = useCallback(() => {
    setActiveModal(null);
    setXpAmount('');
    setXpReason('');
    setSelectedTier('subscriber');
    setMessageText('');
  }, []);

  const handleBulkAwardXp = useCallback(async () => {
    const amount = parseInt(xpAmount, 10);
    if (!amount || amount <= 0) return;

    setLoading(true);
    try {
      const res = await adminFetch('/players/bulk/award-xp', credentials, {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedUserIds, amount, reason: xpReason || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        const result: BulkResult = data.data;
        setToast({
          message: `${t('admin.bulk.awardXp')}: ${result.succeeded}/${result.processed} ${t('admin.bulk.complete')}`,
          variant: result.failed > 0 ? 'info' : 'success',
        });
        resetModalState();
        onComplete();
      } else {
        setToast({ message: data.message || 'Error', variant: 'error' });
      }
    } catch {
      setToast({ message: t('admin.actions.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [xpAmount, xpReason, selectedUserIds, credentials, t, resetModalState, onComplete]);

  const handleBulkChangeTier = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/players/bulk/tier', credentials, {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedUserIds, tier: selectedTier }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({
          message: `${t('admin.bulk.changeTier')}: ${data.data.affected} ${t('admin.bulk.complete')}`,
          variant: 'success',
        });
        resetModalState();
        onComplete();
      } else {
        setToast({ message: data.message || 'Error', variant: 'error' });
      }
    } catch {
      setToast({ message: t('admin.actions.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [selectedUserIds, selectedTier, credentials, t, resetModalState, onComplete]);

  const handleBulkSendMessage = useCallback(async () => {
    if (!messageText.trim()) return;

    setLoading(true);
    try {
      const res = await adminFetch('/players/bulk/message', credentials, {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedUserIds, text: messageText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        const result: BulkResult = data.data;
        setToast({
          message: `${t('admin.bulk.sendMessage')}: ${result.succeeded}/${result.processed} ${t('admin.bulk.complete')}`,
          variant: result.failed > 0 ? 'info' : 'success',
        });
        resetModalState();
        onComplete();
      } else {
        setToast({ message: data.message || 'Error', variant: 'error' });
      }
    } catch {
      setToast({ message: t('admin.actions.error'), variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [messageText, selectedUserIds, credentials, t, resetModalState, onComplete]);

  const handleExport = useCallback(() => {
    // Download CSV of selected user IDs (minimal export — full data comes from the list)
    const header = 'user_id';
    const rows = selectedUserIds.join('\n');
    const csv = `${header}\n${rows}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ message: `${t('admin.bulk.export')}: ${count} users`, variant: 'success' });
  }, [selectedUserIds, count, t]);

  if (count === 0) return null;

  return (
    <>
      {toast && <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />}

      {/* Floating toolbar */}
      <AnimatePresence>
        {count > 0 && !activeModal && (
          <motion.div
            key="bulk-toolbar"
            variants={toolbarVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed bottom-4 left-4 right-4 z-50 bg-telegram-secondaryBg border border-white/10 rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3 flex-wrap"
          >
            <div className="flex items-center gap-2 mr-auto">
              <span className="text-sm font-medium text-telegram-text">
                {count} {t('admin.players.selectedCount')}
              </span>
              <button
                onClick={onClearSelection}
                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                aria-label="Clear selection"
              >
                <X className="w-4 h-4 text-telegram-hint" />
              </button>
            </div>

            <button
              onClick={() => setActiveModal('award-xp')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-medium hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
            >
              <Award className="w-3.5 h-3.5" />
              {t('admin.bulk.awardXp')}
            </button>

            <button
              onClick={() => setActiveModal('change-tier')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              <Users className="w-3.5 h-3.5" />
              {t('admin.bulk.changeTier')}
            </button>

            <button
              onClick={() => setActiveModal('send-message')}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              {t('admin.bulk.sendMessage')}
            </button>

            <button
              onClick={handleExport}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-xs font-medium hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              {t('admin.bulk.export')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <FocusTrap onEscape={() => !loading && resetModalState()} autoFocus={false}>
            <motion.div
              key="bulk-overlay"
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center"
              onClick={() => !loading && resetModalState()}
            >
              <motion.div
                variants={modalVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="w-full max-w-md bg-telegram-secondaryBg rounded-t-2xl p-5 mb-0"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Award XP Modal */}
                {activeModal === 'award-xp' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-telegram-text">{t('admin.bulk.awardXp')}</h3>
                      <button onClick={resetModalState} disabled={loading} className="p-1 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-telegram-hint" />
                      </button>
                    </div>
                    <p className="text-sm text-telegram-hint">
                      {t('admin.bulk.confirmation', { count })}
                    </p>
                    <div>
                      <label className="block text-xs text-telegram-hint mb-1">{t('admin.actions.amount')}</label>
                      <input
                        type="number"
                        min="1"
                        value={xpAmount}
                        onChange={(e) => setXpAmount(e.target.value)}
                        placeholder="100"
                        className="w-full px-3 py-2 bg-telegram-bg rounded-lg text-telegram-text text-sm border border-white/10 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-telegram-hint mb-1">{t('admin.actions.reason')}</label>
                      <input
                        type="text"
                        value={xpReason}
                        onChange={(e) => setXpReason(e.target.value)}
                        placeholder="Bonus reward"
                        className="w-full px-3 py-2 bg-telegram-bg rounded-lg text-telegram-text text-sm border border-white/10 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleBulkAwardXp}
                      disabled={loading || !xpAmount || parseInt(xpAmount, 10) <= 0}
                      className="w-full py-2.5 bg-yellow-500 text-black font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('admin.actions.confirm')}
                    </button>
                  </div>
                )}

                {/* Change Tier Modal */}
                {activeModal === 'change-tier' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-telegram-text">{t('admin.bulk.changeTier')}</h3>
                      <button onClick={resetModalState} disabled={loading} className="p-1 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-telegram-hint" />
                      </button>
                    </div>
                    <p className="text-sm text-telegram-hint">
                      {t('admin.bulk.confirmation', { count })}
                    </p>
                    <div>
                      <label className="block text-xs text-telegram-hint mb-1">{t('admin.players.tier')}</label>
                      <select
                        value={selectedTier}
                        onChange={(e) => setSelectedTier(e.target.value)}
                        className="w-full px-3 py-2 bg-telegram-bg rounded-lg text-telegram-text text-sm border border-white/10 focus:border-blue-500 outline-none"
                      >
                        <option value="free">Free</option>
                        <option value="subscriber">Subscriber</option>
                        <option value="premium">Premium</option>
                      </select>
                    </div>
                    <button
                      onClick={handleBulkChangeTier}
                      disabled={loading}
                      className="w-full py-2.5 bg-purple-500 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('admin.actions.confirm')}
                    </button>
                  </div>
                )}

                {/* Send Message Modal */}
                {activeModal === 'send-message' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-telegram-text">{t('admin.bulk.sendMessage')}</h3>
                      <button onClick={resetModalState} disabled={loading} className="p-1 rounded-full hover:bg-white/10">
                        <X className="w-5 h-5 text-telegram-hint" />
                      </button>
                    </div>
                    <p className="text-sm text-telegram-hint">
                      {t('admin.bulk.confirmation', { count })}
                    </p>
                    <div>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder={t('admin.bulk.sendMessage')}
                        rows={4}
                        className="w-full px-3 py-2 bg-telegram-bg rounded-lg text-telegram-text text-sm border border-white/10 focus:border-blue-500 outline-none resize-none"
                      />
                    </div>
                    <button
                      onClick={handleBulkSendMessage}
                      disabled={loading || !messageText.trim()}
                      className="w-full py-2.5 bg-blue-500 text-white font-medium rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {t('admin.actions.confirm')}
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          </FocusTrap>
        )}
      </AnimatePresence>
    </>
  );
}
