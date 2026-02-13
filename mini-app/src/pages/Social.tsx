import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Swords, UserPlus, PlusCircle, X } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { FriendsList } from '@/components/social/FriendsList';
import { FriendRequestForm } from '@/components/social/FriendRequestForm';
import { ChallengeForm } from '@/components/social/ChallengeForm';
import { ChallengesList } from '@/components/social/ChallengesList';
import { ErrorSection } from '@/components/ErrorSection';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Friend {
  id: number;
  username: string | null;
  first_name: string;
  current_level: number;
  total_xp: number;
  is_active: boolean;
  friends_since: string;
}

interface Challenge {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  progress: number;
  participant_count: number;
}

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

export function Social() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [showChallengeForm, setShowChallengeForm] = useState(false);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '',
  };

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(false);

      const [friendsRes, challengesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/social/friends/${user.id}`, { headers }),
        fetch(`${API_BASE_URL}/social/challenges/${user.id}`, { headers }),
      ]);

      const friendsJson = await friendsRes.json();
      const challengesJson = await challengesRes.json();

      if (friendsJson.success) setFriends(friendsJson.data || []);
      if (challengesJson.success) setChallenges(challengesJson.data || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  if (loading) return <SocialSkeleton />;
  if (error) return <ErrorSection message={t('social.couldNotLoad')} onRetry={loadData} />;

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
              onSuccess={() => { setShowFriendForm(false); }}
              haptic={haptic}
            />
          )}

          <FriendsList friends={friends} />
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
              onSuccess={async () => { await loadData(); setShowChallengeForm(false); }}
              haptic={haptic}
            />
          )}

          <ChallengesList challenges={challenges} />
        </section>
      </div>
    </div>
  );
}
