import { useEffect, useState } from 'react';
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
  current_streak: number;
  total_quests_completed: number;
  xp_rank: number;
  level_rank: number;
}

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

  useEffect(() => { loadLeaderboard(); }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.getLeaderboard(50);
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

  if (loading) {
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
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
            <p className="text-yellow-100 text-sm">Top adventurers ranked by XP</p>
          </div>
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
                  <div className="text-sm font-bold">{entry.total_xp.toLocaleString()}</div>
                  <div className="text-xs text-telegram-hint">XP</div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
