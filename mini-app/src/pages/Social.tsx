import { useState, useEffect, useCallback } from 'react';
import { Users, Swords, UserPlus, PlusCircle, X, Send, Loader2 } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { FriendsList } from '@/components/social/FriendsList';
import { ChallengeCard } from '@/components/social/ChallengeCard';
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
  const { user, haptic } = useTelegram();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Friend request form
  const [showFriendForm, setShowFriendForm] = useState(false);
  const [friendTelegramId, setFriendTelegramId] = useState('');
  const [friendFormLoading, setFriendFormLoading] = useState(false);
  const [friendFormError, setFriendFormError] = useState('');
  const [friendFormSuccess, setFriendFormSuccess] = useState('');

  // Challenge form
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState('');
  const [challengeDescription, setChallengeDescription] = useState('');
  const [challengeMode, setChallengeMode] = useState('');
  const [challengeFormLoading, setChallengeFormLoading] = useState(false);
  const [challengeFormError, setChallengeFormError] = useState('');
  const [challengeFormSuccess, setChallengeFormSuccess] = useState('');

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

  const handleSendFriendRequest = async () => {
    if (!user?.id || !friendTelegramId.trim()) return;
    const toUserId = parseInt(friendTelegramId.trim());
    if (isNaN(toUserId) || toUserId <= 0) {
      setFriendFormError('Please enter a valid Telegram ID');
      return;
    }

    try {
      setFriendFormLoading(true);
      setFriendFormError('');
      setFriendFormSuccess('');

      const res = await fetch(`${API_BASE_URL}/social/friends/request`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromUserId: user.id, toUserId }),
      });

      const data = await res.json();
      if (data.success) {
        haptic.notification('success');
        setFriendFormSuccess('Friend request sent!');
        setFriendTelegramId('');
        setTimeout(() => {
          setShowFriendForm(false);
          setFriendFormSuccess('');
        }, 1500);
      } else {
        setFriendFormError(data.message || 'Failed to send request');
      }
    } catch {
      setFriendFormError('Network error. Try again.');
    } finally {
      setFriendFormLoading(false);
    }
  };

  const handleCreateChallenge = async () => {
    if (!user?.id || !challengeTitle.trim()) return;

    try {
      setChallengeFormLoading(true);
      setChallengeFormError('');
      setChallengeFormSuccess('');

      const res = await fetch(`${API_BASE_URL}/social/challenges/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          creatorId: user.id,
          title: challengeTitle.trim(),
          description: challengeDescription.trim() || null,
          mode: challengeMode.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        haptic.notification('success');
        setChallengeFormSuccess('Challenge created!');
        setChallengeTitle('');
        setChallengeDescription('');
        setChallengeMode('');
        await loadData();
        setTimeout(() => {
          setShowChallengeForm(false);
          setChallengeFormSuccess('');
        }, 1500);
      } else {
        setChallengeFormError(data.message || 'Failed to create challenge');
      }
    } catch {
      setChallengeFormError('Network error. Try again.');
    } finally {
      setChallengeFormLoading(false);
    }
  };

  if (loading) {
    return <SocialSkeleton />;
  }

  if (error) {
    return <ErrorSection message="Could not load social data" onRetry={loadData} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-6 h-6 text-telegram-link" />
          Social
        </h1>

        {/* Friends Section */}
        <section className="mb-8" role="region" aria-label="Friends">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              Friends
            </h2>
            <button
              onClick={() => {
                haptic.impact('light');
                setShowFriendForm(!showFriendForm);
                setFriendFormError('');
                setFriendFormSuccess('');
              }}
              className="flex items-center gap-1 text-sm text-telegram-link font-medium px-3 py-1.5 rounded-xl bg-telegram-link/10 active:scale-95 transition-transform"
            >
              {showFriendForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showFriendForm ? 'Cancel' : 'Add Friend'}
            </button>
          </div>

          {showFriendForm && (
            <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 mb-3">
              <label className="block text-sm font-medium text-telegram-text mb-2">
                Friend's Telegram ID
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={friendTelegramId}
                  onChange={(e) => setFriendTelegramId(e.target.value)}
                  placeholder="Enter Telegram ID"
                  className="flex-1 bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
                />
                <button
                  onClick={handleSendFriendRequest}
                  disabled={friendFormLoading || !friendTelegramId.trim()}
                  className="flex items-center gap-1 bg-telegram-link text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {friendFormLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
              {friendFormError && (
                <p className="text-red-400 text-xs mt-2">{friendFormError}</p>
              )}
              {friendFormSuccess && (
                <p className="text-green-400 text-xs mt-2">{friendFormSuccess}</p>
              )}
            </div>
          )}

          <FriendsList friends={friends} />
        </section>

        {/* Challenges Section */}
        <section role="region" aria-label="Challenges">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Swords className="w-5 h-5 text-telegram-link" aria-hidden="true" />
              Challenges
            </h2>
            <button
              onClick={() => {
                haptic.impact('light');
                setShowChallengeForm(!showChallengeForm);
                setChallengeFormError('');
                setChallengeFormSuccess('');
              }}
              className="flex items-center gap-1 text-sm text-telegram-link font-medium px-3 py-1.5 rounded-xl bg-telegram-link/10 active:scale-95 transition-transform"
            >
              {showChallengeForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {showChallengeForm ? 'Cancel' : 'New Challenge'}
            </button>
          </div>

          {showChallengeForm && (
            <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 mb-3">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">Title *</label>
                  <input
                    type="text"
                    value={challengeTitle}
                    onChange={(e) => setChallengeTitle(e.target.value)}
                    placeholder="Challenge title"
                    maxLength={200}
                    className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">Description</label>
                  <textarea
                    value={challengeDescription}
                    onChange={(e) => setChallengeDescription(e.target.value)}
                    placeholder="Optional description"
                    maxLength={2000}
                    rows={2}
                    className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1">Mode</label>
                  <input
                    type="text"
                    value={challengeMode}
                    onChange={(e) => setChallengeMode(e.target.value)}
                    placeholder="e.g. fitness, study"
                    className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-3 py-2 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:outline-none focus:border-telegram-link"
                  />
                </div>
                <button
                  onClick={handleCreateChallenge}
                  disabled={challengeFormLoading || !challengeTitle.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-telegram-link text-white px-4 py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                >
                  {challengeFormLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  Create Challenge
                </button>
              </div>
              {challengeFormError && (
                <p className="text-red-400 text-xs mt-2">{challengeFormError}</p>
              )}
              {challengeFormSuccess && (
                <p className="text-green-400 text-xs mt-2">{challengeFormSuccess}</p>
              )}
            </div>
          )}

          {challenges.length === 0 ? (
            <div className="text-center py-12">
              <Swords className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
              <p className="text-telegram-hint text-sm">No challenges yet. Create one!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {challenges.map((challenge) => (
                <ChallengeCard key={challenge.id} challenge={challenge} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
