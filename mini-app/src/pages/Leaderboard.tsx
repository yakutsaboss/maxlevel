import { useEffect, useState, useRef, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { Trophy, Medal, Award, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  user_id: number;
  telegram_id: number;
  username: string;
  first_name: string;
  level: number;
  total_xp: number;
  weekly_xp?: number;
  current_streak: number;
  total_quests_completed: number;
  xp_rank: number;
  level_rank: number;
}

type TimePeriod = 'weekly' | 'all_time';

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-500',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(firstName: string, username?: string): string {
  if (firstName) return firstName.charAt(0).toUpperCase();
  if (username) return username.charAt(0).toUpperCase();
  return '?';
}

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
  if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
  if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
  return <span className="text-sm font-bold text-telegram-hint w-6 text-center">{rank}</span>;
}

export function Leaderboard() {
  const { user, haptic } = useTelegram();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const distance = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setPullDistance(Math.min(distance * 0.5, 80));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      haptic.impact('medium');
      setRefreshing(true);
      setPullDistance(0);
      await loadLeaderboard();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, haptic]);

  useEffect(() => { loadLeaderboard(); }, [timePeriod]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = timePeriod === 'weekly'
        ? await apiClient.getWeeklyLeaderboard(50)
        : await apiClient.getLeaderboard(50);
      if (response.success && response.data) {
        setEntries(response.data as LeaderboardEntry[]);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-b-3xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="skeleton w-14 h-14 rounded-2xl" />
            <div>
              <div className="skeleton h-7 w-32 rounded-lg mb-2" />
              <div className="skeleton h-4 w-44 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="px-4 mt-6 space-y-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 flex items-center gap-3">
              <div className="skeleton w-6 h-6 rounded-full" />
              <div className="skeleton w-10 h-10 rounded-full" />
              <div className="flex-1">
                <div className="skeleton-text h-4 w-24 mb-1">&nbsp;</div>
                <div className="skeleton-text h-3 w-16">&nbsp;</div>
              </div>
              <div className="skeleton h-6 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">Something went wrong</h3>
          <p className="text-sm text-red-500 mb-4">Could not load the leaderboard</p>
          <button onClick={() => { haptic.impact('light'); loadLeaderboard(); }} className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  const currentUserId = user?.id;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={`pull-indicator ${refreshing ? 'active refreshing' : ''}`} style={{ height: refreshing ? 48 : pullDistance > 10 ? pullDistance : 0 }}>
        <RefreshCw className={`w-5 h-5 text-telegram-hint ${pullDistance >= PULL_THRESHOLD ? 'text-telegram-link' : ''}`} />
      </div>
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-yellow-100 text-sm">Top adventurers ranked by XP</p>
          </div>
        </div>
        {/* Time period tabs */}
        <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
          <button
            onClick={() => { haptic.selection(); setTimePeriod('weekly'); }}
            className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${
              timePeriod === 'weekly' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => { haptic.selection(); setTimePeriod('all_time'); }}
            className={`flex-1 py-2 px-4 rounded-xl font-medium text-sm transition-all ${
              timePeriod === 'all_time' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="px-4 mt-6 space-y-2">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">No rankings yet. Be the first!</p>
          </div>
        ) : (
          entries.map((entry, index) => {
            const isCurrentUser = currentUserId === entry.telegram_id;
            const rank = entry.xp_rank || index + 1;
            return (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-2xl p-3 flex items-center gap-3 border-2 transition-colors ${
                  isCurrentUser
                    ? 'bg-telegram-link/10 border-telegram-link'
                    : 'bg-telegram-secondaryBg border-transparent'
                }`}
              >
                <div className="w-8 flex-shrink-0 flex justify-center">
                  <RankIcon rank={rank} />
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${getAvatarColor(entry.first_name || entry.username || '')}`}>
                  {getInitials(entry.first_name, entry.username)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`font-semibold text-sm truncate ${isCurrentUser ? 'text-telegram-link' : ''}`}>
                      {entry.first_name || entry.username || 'Adventurer'}
                    </span>
                    {isCurrentUser && (
                      <span className="text-xs bg-telegram-link text-white px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-telegram-hint">
                    <span>Lv {entry.level}</span>
                    {entry.current_streak > 0 && <span>🔥 {entry.current_streak}d</span>}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold">{(timePeriod === 'weekly' && entry.weekly_xp != null ? entry.weekly_xp : entry.total_xp).toLocaleString()}</div>
                  <div className="text-xs text-telegram-hint">{timePeriod === 'weekly' ? 'Weekly XP' : 'XP'}</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
