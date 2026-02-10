import { useEffect, useState, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '@/types';
import { ErrorSection } from '@/components/ErrorSection';

type TimePeriod = 'weekly' | 'monthly' | 'all_time';

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

function RankIcon({ rank, isTop }: { rank: number; isTop?: boolean }) {
  if (rank === 1) return <Trophy className={`${isTop ? 'w-7 h-7' : 'w-6 h-6'} text-yellow-500`} />;
  if (rank === 2) return <Medal className={`${isTop ? 'w-7 h-7' : 'w-6 h-6'} text-gray-400`} />;
  if (rank === 3) return <Award className={`${isTop ? 'w-7 h-7' : 'w-6 h-6'} text-amber-600`} />;
  return <span className="text-sm font-bold text-telegram-hint w-6 text-center">{rank}</span>;
}

const TOP_RANK_STYLES: Record<number, { border: string; bg: string; glow: string }> = {
  1: { border: 'border-yellow-400', bg: 'bg-yellow-500/10', glow: 'shadow-yellow-500/20 shadow-md' },
  2: { border: 'border-gray-400', bg: 'bg-gray-400/10', glow: 'shadow-gray-400/20 shadow-md' },
  3: { border: 'border-amber-600', bg: 'bg-amber-600/10', glow: 'shadow-amber-600/20 shadow-md' },
};

export function Leaderboard() {
  const { user, haptic } = useTelegram();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = timePeriod === 'weekly'
        ? await apiClient.getWeeklyLeaderboard(50)
        : timePeriod === 'monthly'
          ? await apiClient.getMonthlyLeaderboard(50)
          : await apiClient.getLeaderboard(50);
      if (response.success && response.data) {
        setEntries(response.data);
      }
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => { await loadLeaderboard(); }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => { loadLeaderboard(); }, [timePeriod]);

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
    return <ErrorSection message="Could not load the leaderboard" onRetry={loadLeaderboard} />;
  }

  const currentUserId = user?.id;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-b-3xl shadow-lg safe-area-top">
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
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
              timePeriod === 'weekly' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
            }`}
          >
            Weekly
          </button>
          <button
            onClick={() => { haptic.selection(); setTimePeriod('monthly'); }}
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
              timePeriod === 'monthly' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => { haptic.selection(); setTimePeriod('all_time'); }}
            className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
              timePeriod === 'all_time' ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
            }`}
          >
            All Time
          </button>
        </div>
      </div>

      <div className="px-4 mt-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">No rankings yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Top 3 with special styling */}
            <div className="space-y-2.5">
              {entries.slice(0, 3).map((entry, index) => {
                const isCurrentUser = currentUserId === entry.telegram_id;
                const rank = entry.xp_rank || index + 1;
                const rankStyle = TOP_RANK_STYLES[rank];
                const xpValue = timePeriod === 'weekly' && entry.weekly_xp != null ? entry.weekly_xp : timePeriod === 'monthly' && entry.monthly_xp != null ? entry.monthly_xp : entry.total_xp;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`rounded-2xl p-4 flex items-center gap-3 border-2 ${
                      isCurrentUser
                        ? 'bg-telegram-link/10 border-telegram-link'
                        : rankStyle
                          ? `${rankStyle.bg} ${rankStyle.border} ${rankStyle.glow}`
                          : 'bg-telegram-secondaryBg border-transparent'
                    }`}
                  >
                    <div className="w-9 flex-shrink-0 flex justify-center">
                      <RankIcon rank={rank} isTop />
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base flex-shrink-0 ${getAvatarColor(entry.first_name || entry.username || '')}`}>
                      {getInitials(entry.first_name, entry.username)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold text-sm truncate ${isCurrentUser ? 'text-telegram-link' : ''}`}>
                          {entry.first_name || entry.username || 'Adventurer'}
                        </span>
                        {isCurrentUser && (
                          <span className="text-xs bg-telegram-link text-white px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-telegram-hint mt-0.5">
                        <span>Lv {entry.level}</span>
                        <span>·</span>
                        <span>{entry.total_quests_completed} quests</span>
                        {entry.current_streak > 0 && <span>🔥 {entry.current_streak}d</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-base font-bold">{xpValue.toLocaleString()}</div>
                      <div className="text-xs text-telegram-hint">{timePeriod === 'weekly' ? 'Weekly XP' : timePeriod === 'monthly' ? 'Monthly XP' : 'XP'}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Separator between top 3 and rest */}
            {entries.length > 3 && (
              <div className="flex items-center gap-3 my-4 px-2">
                <div className="flex-1 h-px bg-telegram-hint/20" />
                <span className="text-xs text-telegram-hint">#{4} and below</span>
                <div className="flex-1 h-px bg-telegram-hint/20" />
              </div>
            )}

            {/* Rest of the list */}
            <div className="space-y-1.5">
              {entries.slice(3).map((entry, index) => {
                const isCurrentUser = currentUserId === entry.telegram_id;
                const rank = entry.xp_rank || index + 4;
                const xpValue = timePeriod === 'weekly' && entry.weekly_xp != null ? entry.weekly_xp : timePeriod === 'monthly' && entry.monthly_xp != null ? entry.monthly_xp : entry.total_xp;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (index + 3) * 0.03 }}
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
                        <span>·</span>
                        <span>{entry.total_quests_completed} quests</span>
                        {entry.current_streak > 0 && <span>🔥 {entry.current_streak}d</span>}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold">{xpValue.toLocaleString()}</div>
                      <div className="text-xs text-telegram-hint">{timePeriod === 'weekly' ? 'Weekly XP' : timePeriod === 'monthly' ? 'Monthly XP' : 'XP'}</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
