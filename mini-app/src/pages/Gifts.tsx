import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Send, Inbox, ChevronLeft, ChevronRight, Star, X } from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { getFriends } from '@/api/social';
import type { Friend } from '@/api/social';

// --- Types ---

interface AvailableGift {
  id: string;
  title: string;
  star_count: number;
  total_count: number | null;
  remaining_count: number | null;
  is_premium: boolean;
  sticker_file_id: string | null;
  sticker_file_unique_id: string | null;
}

interface ReceivedGift {
  id: number;
  gift_id: string;
  gift_title: string | null;
  stars_cost: number;
  message: string | null;
  sent_at: string;
  from_username: string | null;
  from_first_name: string;
}

type SendStep = 'pickFriend' | 'pickGift' | 'confirm';

// --- API calls ---

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

async function fetchAvailableGifts(): Promise<AvailableGift[]> {
  const res = await fetch(`${API_BASE_URL}/gifts/available`, { headers: getAuthHeaders() });
  const json = await res.json();
  return json.success ? (json.data as AvailableGift[]) : [];
}

async function fetchReceivedGifts(userId: number): Promise<ReceivedGift[]> {
  const res = await fetch(`${API_BASE_URL}/gifts/received/${userId}`, { headers: getAuthHeaders() });
  const json = await res.json();
  return json.success ? (json.data as ReceivedGift[]) : [];
}

async function sendGift(fromUserId: number, toUserId: number, giftId: string, message?: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/gifts/send`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ from_user_id: fromUserId, to_user_id: toUserId, gift_id: giftId, message }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || json.message || 'Failed to send gift');
}

// --- Helpers ---

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- Sub-components ---

function ReceivedTab({ gifts, loading }: { gifts: ReceivedGift[]; loading: boolean }) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 flex gap-3 animate-pulse">
            <div className="w-12 h-12 rounded-xl bg-telegram-hint/20 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-telegram-hint/20 rounded w-32" />
              <div className="h-3 bg-telegram-hint/20 rounded w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (gifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-telegram-hint/10 flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-telegram-hint" />
        </div>
        <p className="text-telegram-text font-medium mb-1">{t('gifts.empty')}</p>
        <p className="text-telegram-hint text-sm">{t('gifts.emptyHint')}</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-3 pb-6">
      <AnimatePresence initial={false}>
        {gifts.map((gift, i) => (
          <motion.div
            key={gift.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-telegram-secondaryBg rounded-2xl p-4 flex gap-3 items-center border border-telegram-hint/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-400 to-rose-500 flex items-center justify-center flex-shrink-0 text-2xl">
              {gift.gift_title ?? '🎁'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-0.5">
                <span className="text-telegram-text font-medium text-sm">{t('gifts.from')} {gift.from_first_name}</span>
                {gift.from_username && (
                  <span className="text-telegram-hint text-xs">@{gift.from_username}</span>
                )}
              </div>
              {gift.message && (
                <p className="text-telegram-hint text-xs italic truncate">"{gift.message}"</p>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-0.5 text-yellow-400 text-xs font-medium">
                  <Star className="w-3 h-3" />
                  {gift.stars_cost}
                </span>
                <span className="text-telegram-hint text-xs">{formatDate(gift.sent_at)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

interface SendTabProps {
  friends: Friend[];
  availableGifts: AvailableGift[];
  loading: boolean;
  sending: boolean;
  onSend: (toUserId: number, giftId: string, message?: string) => Promise<void>;
}

function SendTab({ friends, availableGifts, loading, sending, onSend }: SendTabProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<SendStep>('pickFriend');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGift, setSelectedGift] = useState<AvailableGift | null>(null);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handlePickFriend = useCallback((friend: Friend) => {
    setSelectedFriend(friend);
    setStep('pickGift');
  }, []);

  const handlePickGift = useCallback((gift: AvailableGift) => {
    setSelectedGift(gift);
    setStep('confirm');
  }, []);

  const handleSend = useCallback(async () => {
    if (!selectedFriend || !selectedGift) return;
    await onSend(selectedFriend.id, selectedGift.id, message || undefined);
    setSent(true);
  }, [selectedFriend, selectedGift, message, onSend]);

  const handleReset = useCallback(() => {
    setStep('pickFriend');
    setSelectedFriend(null);
    setSelectedGift(null);
    setMessage('');
    setSent(false);
  }, []);

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 text-4xl"
        >
          🎁
        </motion.div>
        <p className="text-telegram-text font-semibold text-lg mb-1">{t('gifts.sent')}</p>
        <p className="text-telegram-hint text-sm mb-6">
          {selectedGift?.title ?? '🎁'} → {selectedFriend?.first_name}
        </p>
        <button
          onClick={handleReset}
          className="px-6 py-2 rounded-xl bg-telegram-button text-telegram-buttonText text-sm font-medium"
        >
          {t('gifts.sendAnother')}
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {/* Step breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-xs text-telegram-hint">
        {(['pickFriend', 'pickGift', 'confirm'] as SendStep[]).map((s, i) => (
          <span key={s} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3" />}
            <span className={step === s ? 'text-telegram-link font-medium' : ''}>
              {s === 'pickFriend' ? t('gifts.selectFriend') : s === 'pickGift' ? t('gifts.selectGift') : t('gifts.confirm')}
            </span>
          </span>
        ))}
      </div>

      {/* Step: Pick friend */}
      {step === 'pickFriend' && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <p className="text-telegram-hint text-sm">{t('gifts.noFriends')}</p>
            </div>
          ) : (
            friends.map((friend) => (
              <motion.button
                key={friend.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handlePickFriend(friend)}
                className="w-full bg-telegram-secondaryBg rounded-2xl p-4 flex items-center gap-3 border border-telegram-hint/10 text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {friend.first_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-telegram-text font-medium text-sm">{friend.first_name}</p>
                  {friend.username && <p className="text-telegram-hint text-xs">@{friend.username}</p>}
                </div>
                <ChevronRight className="w-4 h-4 text-telegram-hint" />
              </motion.button>
            ))
          )}
        </div>
      )}

      {/* Step: Pick gift */}
      {step === 'pickGift' && (
        <div>
          <button
            onClick={() => setStep('pickFriend')}
            className="flex items-center gap-1 text-telegram-link text-sm mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> {t('gifts.back')}
          </button>
          <p className="text-telegram-hint text-xs mb-3">
            {t('gifts.sendingTo')} <span className="text-telegram-text font-medium">{selectedFriend?.first_name}</span>
          </p>
          {availableGifts.length === 0 ? (
            <p className="text-telegram-hint text-sm text-center py-8">{t('gifts.noGiftsAvailable')}</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {availableGifts.map((gift) => (
                <motion.button
                  key={gift.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handlePickGift(gift)}
                  className="bg-telegram-secondaryBg rounded-2xl p-4 flex flex-col items-center gap-2 border border-telegram-hint/10"
                >
                  <div className="text-4xl">{gift.title}</div>
                  <div className="flex items-center gap-0.5 text-yellow-400 font-semibold text-sm">
                    <Star className="w-3.5 h-3.5" />
                    {gift.star_count}
                  </div>
                  {gift.remaining_count !== null && (
                    <span className="text-telegram-hint text-xs">{gift.remaining_count} left</span>
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step: Confirm + message */}
      {step === 'confirm' && (
        <div>
          <button
            onClick={() => setStep('pickGift')}
            className="flex items-center gap-1 text-telegram-link text-sm mb-4"
          >
            <ChevronLeft className="w-4 h-4" /> {t('gifts.back')}
          </button>

          <div className="bg-telegram-secondaryBg rounded-2xl p-5 mb-4 flex flex-col items-center gap-3 border border-telegram-hint/10">
            <div className="text-5xl">{selectedGift?.title ?? '🎁'}</div>
            <div className="text-center">
              <p className="text-telegram-text font-medium">{t('gifts.sendingTo')} {selectedFriend?.first_name}</p>
              <p className="flex items-center justify-center gap-1 text-yellow-400 font-semibold text-sm mt-0.5">
                <Star className="w-3.5 h-3.5" />
                {selectedGift?.star_count} Stars
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-telegram-hint text-xs mb-1.5">{t('gifts.message')} ({t('common.optional')})</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={255}
              rows={3}
              placeholder={t('gifts.messagePlaceholder')}
              className="w-full bg-telegram-secondaryBg text-telegram-text text-sm rounded-xl px-4 py-3 border border-telegram-hint/20 focus:border-telegram-link outline-none resize-none placeholder:text-telegram-hint/50"
            />
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleSend}
            disabled={sending}
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {sending ? (
              <span className="animate-pulse">{t('gifts.sending')}</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t('gifts.confirmSend')}
              </>
            )}
          </motion.button>
        </div>
      )}
    </div>
  );
}

// --- Main component ---

export function Gifts() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'received' | 'send'>('received');

  // State
  const [internalUserId, setInternalUserId] = useState<number | null>(null);
  const [receivedGifts, setReceivedGifts] = useState<ReceivedGift[]>([]);
  const [availableGifts, setAvailableGifts] = useState<AvailableGift[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingReceived, setLoadingReceived] = useState(false);
  const [loadingGifts, setLoadingGifts] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => navigate(-1), [navigate]);
  useBackButton(handleBack);

  // Resolve internal user ID from Telegram ID
  useEffect(() => {
    if (!user?.id) return;
    apiClient.getUserStats(user.id).then((res) => {
      if (res.success && res.data?.user.id) {
        setInternalUserId(res.data.user.id);
      }
    }).catch(() => {/* ignore */});
  }, [user?.id]);

  // Load received gifts when tab is active and we have userId
  useEffect(() => {
    if (activeTab !== 'received' || !internalUserId) return;
    setLoadingReceived(true);
    fetchReceivedGifts(internalUserId)
      .then(setReceivedGifts)
      .catch(() => setError('Failed to load gifts'))
      .finally(() => setLoadingReceived(false));
  }, [activeTab, internalUserId]);

  // Load available gifts + friends when Send tab is active
  useEffect(() => {
    if (activeTab !== 'send' || !internalUserId) return;
    setLoadingGifts(true);
    Promise.all([
      fetchAvailableGifts(),
      getFriends(internalUserId),
    ])
      .then(([gifts, friendList]) => {
        setAvailableGifts(gifts);
        setFriends(friendList);
      })
      .catch(() => setError('Failed to load gift catalog'))
      .finally(() => setLoadingGifts(false));
  }, [activeTab, internalUserId]);

  const handleSend = useCallback(async (toUserId: number, giftId: string, message?: string) => {
    if (!internalUserId) return;
    setSending(true);
    setError(null);
    try {
      await sendGift(internalUserId, toUserId, giftId, message);
      haptic?.impact('medium');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send gift');
      throw err;
    } finally {
      setSending(false);
    }
  }, [internalUserId, haptic]);

  const handleTabChange = useCallback((tab: 'received' | 'send') => {
    haptic?.impact('light');
    setActiveTab(tab);
    setError(null);
  }, [haptic]);

  return (
    <div className="min-h-screen bg-telegram-bg pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 to-rose-600 pt-8 pb-6 px-6 rounded-b-3xl safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-white font-bold text-xl">{t('gifts.title')}</h1>
        </div>

        {/* Tabs */}
        <div className="flex bg-white/20 rounded-xl p-1 gap-1">
          <button
            onClick={() => handleTabChange('received')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'received'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <Inbox className="w-4 h-4" />
            {t('gifts.received')}
          </button>
          <button
            onClick={() => handleTabChange('send')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'send'
                ? 'bg-white text-rose-600 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <Send className="w-4 h-4" />
            {t('gifts.send')}
          </button>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mx-4 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-2"
          >
            <span className="text-red-400 text-sm flex-1">{error}</span>
            <button onClick={() => setError(null)}><X className="w-4 h-4 text-red-400" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: activeTab === 'send' ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'received' ? (
            <ReceivedTab gifts={receivedGifts} loading={loadingReceived} />
          ) : (
            <SendTab
              friends={friends}
              availableGifts={availableGifts}
              loading={loadingGifts}
              sending={sending}
              onSend={handleSend}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
