import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@/types';
import { ErrorSection } from '@/components/ErrorSection';
import { TimePeriodTabs, type TimePeriod } from '@/components/leaderboard/TimePeriodTabs';
import { TopThreeCard } from '@/components/leaderboard/TopThreeCard';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { LeaderboardSkeleton } from '@/components/leaderboard/LeaderboardSkeleton';
import { YourRankCard } from '@/components/leaderboard/YourRankCard';
import { logger } from '@/utils/logger';

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
      logger.error('Failed to load leaderboard', { error: err });
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => { await loadLeaderboard(); }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const currentUserId = user?.id;

  const currentUserEntry = useMemo(() => {
    if (!currentUserId) return null;
    return entries.find(e => e.telegram_id === currentUserId) ?? null;
  }, [entries, currentUserId]);

  const currentUserRank = useMemo(() => {
    if (!currentUserEntry) return null;
    const idx = entries.indexOf(currentUserEntry);
    return currentUserEntry.xp_rank || idx + 1;
  }, [entries, currentUserEntry]);

  useEffect(() => { loadLeaderboard(); }, [timePeriod]);

  if (loading && !refreshing) return <LeaderboardSkeleton />;
  if (error) return <ErrorSection message="Could not load the leaderboard" onRetry={loadLeaderboard} />;

  const isUserInList = currentUserEntry !== null;

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
        <TimePeriodTabs timePeriod={timePeriod} onSelect={setTimePeriod} haptic={haptic} />
      </div>

      <div className="px-4 mt-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">No rankings yet. Be the first!</p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5" role="table" aria-label="Top 3 players">
              {entries.slice(0, 3).map((entry, index) => (
                <TopThreeCard
                  key={entry.user_id}
                  entry={entry}
                  rank={entry.xp_rank || index + 1}
                  isCurrentUser={currentUserId === entry.telegram_id}
                  timePeriod={timePeriod}
                  index={index}
                />
              ))}
            </div>

            {entries.length > 3 && (
              <div className="flex items-center gap-3 my-4 px-2">
                <div className="flex-1 h-px bg-telegram-hint/20" />
                <span className="text-xs text-telegram-hint">#{4} and below</span>
                <div className="flex-1 h-px bg-telegram-hint/20" />
              </div>
            )}

            <div className="space-y-1.5 pb-16" role="table" aria-label="Leaderboard rankings">
              {entries.slice(3).map((entry, index) => (
                <LeaderboardRow
                  key={entry.user_id}
                  entry={entry}
                  rank={entry.xp_rank || index + 4}
                  isCurrentUser={currentUserId === entry.telegram_id}
                  timePeriod={timePeriod}
                  index={index}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {currentUserId && (
        <YourRankCard
          entry={isUserInList ? currentUserEntry : null}
          rank={currentUserRank}
          timePeriod={timePeriod}
        />
      )}
    </div>
  );
}
