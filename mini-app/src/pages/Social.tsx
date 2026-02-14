import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Swords, UserPlus, PlusCircle, X, Bell, Check, XCircle, UserMinus } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { useSocial } from '@/hooks/useSocial';
import { FriendRequestForm } from '@/components/social/FriendRequestForm';
import { ChallengeForm } from '@/components/social/ChallengeForm';
import { ChallengesList } from '@/components/social/ChallengesList';
import { ErrorSection } from '@/components/ErrorSection';
import type { PendingRequest, Friend } from '@/api/social';

function SocialSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg p-4 pb-20 animate-pulse">
      <div className="h-8 w-32 bg-telegram-hint/20 rounded-lg mb-6" />
      <div className="h-6 w-24 bg-telegram-hint/20 rounded mb-3" />
      <div className="space-y-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-telegram-hint/20" />
              <div className="flex-1">
                <div className="h-4 w-28 bg-telegram-hint/20 rounded mb-1.5" />
                <div className="h-3 w-20 bg-telegram-hint/20 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="h-6 w-28 bg-telegram-hint/20 rounded mb-3" />
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
            <div className="h-5 w-36 bg-telegram-hint/20 rounded mb-3" />
            <div className="h-2 w-full bg-telegram-hint/20 rounded-full mb-3" />
            <div className="h-3 w-24 bg-telegram-hint/20 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PendingRequestCard({
  request,
  onAccept,
  onReject,
  loading,
}: {
  request: PendingRequest;
  onAccept: () => void;
  onReject: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-yellow-500">
          {request.from_user.first_name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-telegram-text truncate">
          {request.from_user.first_name}
          {request.from_user.username && (
            <span className="text-telegram-hint text-xs ml-1">@{request.from_user.username}</span>
          )}
        </div>
        <div className="text-xs text-telegram-hint mt-0.5">
          {t('social.level')}{request.from_user.current_level}
        </div>
      </div>

      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onAccept}
          disabled={loading}
          className="p-2 rounded-xl bg-green-500/20 text-green-400 active:scale-95 transition-transform disabled:opacity-50"
          aria-label={t('social.accept')}
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={onReject}
          disabled={loading}
          className="p-2 rounded-xl bg-red-500/20 text-red-400 active:scale-95 transition-transform disabled:opacity-50"
          aria-label={t('social.reject')}
        >
          <XCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function FriendCardWithRemove({
  friend,
  onRemove,
  loading,
}: {
  friend: Friend;
  onRemove: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 flex items-center gap-3">
      <div className="w-10 h-10 rounded-full bg-telegram-link/20 flex items-center justify-center flex-shrink-0">
        <span className="text-lg font-bold text-telegram-link">
          {friend.first_name.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-medium text-telegram-text truncate">
          {friend.first_name}
          {friend.username && (
            <span className="text-telegram-hint text-xs ml-1">@{friend.username}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-telegram-hint mt-0.5">
          <span>{t('social.level')}{friend.current_level}</span>
          <span>{friend.total_xp.toLocaleString()} XP</span>
        </div>
      </div>

      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${friend.is_active ? 'bg-green-400' : 'bg-telegram-hint/30'}`} />

      {showConfirm ? (
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={() => { onRemove(); setShowConfirm(false); }}
            disabled={loading}
            className="p-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs active:scale-95 transition-transform disabled:opacity-50"
          >
            <Check className="w-3 h-3" />
          </button>
          <button
            onClick={() => setShowConfirm(false)}
            className="p-1.5 rounded-lg bg-telegram-hint/20 text-telegram-hint text-xs active:scale-95 transition-transform"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="p-2 rounded-xl text-telegram-hint/50 active:scale-95 transition-transform"
          aria-label={t('social.unfriend')}
        >
          <UserMinus className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export function Social() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const {
    friends,
    pendingRequests,
    challenges,
    loading,
    error,
    refresh,
    acceptRequest,
    rejectRequest,
    removeFriend,
  } = useSocial({ userId: user?.id });

  const [showFriendForm, setShowFriendForm] = useState(false);
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const handleRefresh = useCallback(async () => {
    await refresh();
  }, [refresh]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleAccept = useCallback(async (requestId: number) => {
    try {
      setActionLoading(true);
      await acceptRequest(requestId);
      haptic.notification('success');
    } catch {
      haptic.notification('error');
    } finally {
      setActionLoading(false);
    }
  }, [acceptRequest, haptic]);

  const handleReject = useCallback(async (requestId: number) => {
    try {
      setActionLoading(true);
      await rejectRequest(requestId);
    } catch {
      haptic.notification('error');
    } finally {
      setActionLoading(false);
    }
  }, [rejectRequest, haptic]);

  const handleRemoveFriend = useCallback(async (friendId: number) => {
    try {
      setActionLoading(true);
      await removeFriend(friendId);
    } catch {
      haptic.notification('error');
    } finally {
      setActionLoading(false);
    }
  }, [removeFriend, haptic]);

  if (loading) return <SocialSkeleton />;
  if (error) return <ErrorSection message={t('social.couldNotLoad')} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Users className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('social.title')}</h1>
            <p className="text-blue-100 text-sm">{t('social.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Pending Requests Section */}
        {pendingRequests.length > 0 && (
          <section className="mb-6" role="region" aria-label="Pending Requests">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Bell className="w-5 h-5 text-yellow-500" aria-hidden="true" />
              {t('social.pendingRequests')}
              <span className="bg-yellow-500/20 text-yellow-500 text-xs font-bold px-2 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            </h2>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <PendingRequestCard
                  key={req.id}
                  request={req}
                  onAccept={() => handleAccept(req.id)}
                  onReject={() => handleReject(req.id)}
                  loading={actionLoading}
                />
              ))}
            </div>
          </section>
        )}

        {/* Friends Section */}
        <section className="mb-8" role="region" aria-label="Friends">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              {t('social.friends')}
            </h2>
            <button
              onClick={() => { haptic.impact('light'); setShowFriendForm(!showFriendForm); }}
              className="flex items-center gap-1 text-sm text-telegram-link font-medium px-3 py-1.5 rounded-xl bg-telegram-link/10 active:scale-95 transition-transform"
            >
              {showFriendForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showFriendForm ? t('common.cancel') : t('social.addFriend')}
            </button>
          </div>

          {showFriendForm && user?.id && (
            <FriendRequestForm
              userId={user.id}
              onSuccess={() => { setShowFriendForm(false); refresh(); }}
              haptic={haptic}
            />
          )}

          {friends.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
              <p className="text-telegram-hint text-sm">{t('social.noFriends')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <FriendCardWithRemove
                  key={friend.id}
                  friend={friend}
                  onRemove={() => handleRemoveFriend(friend.id)}
                  loading={actionLoading}
                />
              ))}
            </div>
          )}
        </section>

        {/* Challenges Section */}
        <section role="region" aria-label="Challenges">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Swords className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              {t('social.challenges')}
            </h2>
            <button
              onClick={() => { haptic.impact('light'); setShowChallengeForm(!showChallengeForm); }}
              className="flex items-center gap-1 text-sm text-telegram-link font-medium px-3 py-1.5 rounded-xl bg-telegram-link/10 active:scale-95 transition-transform"
            >
              {showChallengeForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {showChallengeForm ? t('common.cancel') : t('social.newChallenge')}
            </button>
          </div>

          {showChallengeForm && user?.id && (
            <ChallengeForm
              userId={user.id}
              onSuccess={async () => { await refresh(); setShowChallengeForm(false); }}
              haptic={haptic}
            />
          )}

          <ChallengesList challenges={challenges} />
        </section>
      </div>
    </div>
  );
}
