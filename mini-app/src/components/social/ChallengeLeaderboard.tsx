import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, AlertCircle, RefreshCw, Crown } from 'lucide-react';
import { getChallengeLeaderboard } from '@/api/social';
import type { LeaderboardEntry } from '@/api/social';

interface ChallengeLeaderboardProps {
  challengeId: number;
  userId: number;
}

export function ChallengeLeaderboard({ challengeId, userId }: ChallengeLeaderboardProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(false);
      const data = await getChallengeLeaderboard(challengeId, userId);
      setEntries(data.leaderboard);
      setUserRank(data.userRank);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [challengeId, userId]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl bg-telegram-bg/50">
            <div className="w-7 h-5 bg-telegram-hint/20 rounded" />
            <div className="w-8 h-8 rounded-full bg-telegram-hint/20" />
            <div className="flex-1">
              <div className="h-4 w-24 bg-telegram-hint/20 rounded" />
            </div>
            <div className="h-4 w-16 bg-telegram-hint/20 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-telegram-hint text-sm mb-4">{t('errors.somethingWentWrong')}</p>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-telegram-link/10 text-telegram-link text-sm font-medium active:scale-95 transition-transform"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-10 h-10 text-telegram-hint/40 mx-auto mb-3" />
        <p className="text-telegram-hint text-sm">{t('leaderboard.noRankings')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-1">
        {entries.map((entry) => {
          const isCurrentUser = entry.user_id === userId;

          return (
            <div
              key={entry.user_id}
              className={`flex items-center gap-3 py-2.5 px-3 rounded-xl ${
                isCurrentUser
                  ? 'bg-telegram-link/10 border border-telegram-link/20'
                  : 'bg-telegram-bg/50'
              }`}
            >
              {/* Rank */}
              <div className="w-7 text-center flex-shrink-0">
                {entry.rank <= 3 ? (
                  <Trophy className={`w-4 h-4 mx-auto ${
                    entry.rank === 1 ? 'text-yellow-400' :
                    entry.rank === 2 ? 'text-gray-400' :
                    'text-amber-600'
                  }`} />
                ) : (
                  <span className="text-xs text-telegram-hint font-medium">
                    #{entry.rank}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                isCurrentUser ? 'bg-telegram-link/20' : 'bg-telegram-hint/20'
              }`}>
                <span className={`text-sm font-bold ${
                  isCurrentUser ? 'text-telegram-link' : 'text-telegram-hint'
                }`}>
                  {entry.first_name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className={`text-sm font-medium truncate ${
                    isCurrentUser ? 'text-telegram-link' : 'text-telegram-text'
                  }`}>
                    {entry.first_name}
                  </span>
                  {entry.rank === 1 && (
                    <Crown className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                {entry.username && (
                  <span className="text-xs text-telegram-hint">@{entry.username}</span>
                )}
              </div>

              {/* Progress bar + percentage */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {entry.percentage !== null && (
                  <div className="w-16">
                    <div className="h-1.5 bg-telegram-hint/20 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          entry.percentage >= 100 ? 'bg-green-400' : 'bg-telegram-link'
                        }`}
                        style={{ width: `${entry.percentage}%` }}
                      />
                    </div>
                  </div>
                )}
                <span className={`text-sm font-semibold ${
                  isCurrentUser ? 'text-telegram-link' : 'text-telegram-text'
                }`}>
                  {entry.current_progress}
                  {entry.target_value ? `/${entry.target_value}` : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* User's rank if not in top 10 */}
      {userRank !== null && (
        <div className="mt-3 text-center">
          <span className="text-xs text-telegram-hint">
            {t('leaderboard.yourRank')}: #{userRank}
          </span>
        </div>
      )}
    </div>
  );
}
