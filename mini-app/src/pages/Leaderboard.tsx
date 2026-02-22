import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { useLeaderboard, leaderboardKeys } from '@/hooks/useLeaderboardQuery';
import type { TimePeriod } from '@/hooks/useLeaderboardQuery';
import { Trophy, Share2 } from 'lucide-react';
import { ErrorSection } from '@/components/ErrorSection';
import { TimePeriodTabs } from '@/components/leaderboard/TimePeriodTabs';
import { TopThreeCard } from '@/components/leaderboard/TopThreeCard';
import { LeaderboardRow } from '@/components/leaderboard/LeaderboardRow';
import { LeaderboardSkeleton } from '@/components/leaderboard/LeaderboardSkeleton';
import { YourRankCard } from '@/components/leaderboard/YourRankCard';

export function Leaderboard() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const queryClient = useQueryClient();
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all_time');

  const { data: entries = [], isLoading, isError, refetch } = useLeaderboard(timePeriod, 50);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: leaderboardKeys.list(timePeriod, 50) });
  }, [timePeriod, queryClient]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const currentUserId = user?.id;

  const currentUserEntry = useMemo(() => {
    if (!currentUserId) return null;
    return entries.find(e => e.telegram_id === currentUserId) ?? null;
  }, [entries, currentUserId]);

  const currentUserRank = useMemo(() => {
    if (!currentUserEntry) return null;
    if (currentUserEntry.xp_rank) return currentUserEntry.xp_rank;
    const idx = entries.indexOf(currentUserEntry);
    return idx >= 0 ? idx + 1 : null;
  }, [entries, currentUserEntry]);

  const handleShare = useCallback(() => {
    const shareText = currentUserRank && currentUserEntry
      ? t('leaderboard.shareRank', { rank: currentUserRank, xp: currentUserEntry.total_xp.toLocaleString() })
      : t('leaderboard.shareMessage');
    const botLink = 'https://t.me/maxlevel_rpg_bot/app';

    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp?.openTelegramLink) {
      const encoded = encodeURIComponent(`${shareText}\n${botLink}`);
      tgWebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(botLink)}&text=${encoded}`);
    } else if (navigator.share) {
      navigator.share({ title: 'MaxLevel Leaderboard', text: shareText, url: botLink }).catch(() => {});
    }
    haptic?.impact('light');
  }, [currentUserRank, currentUserEntry, haptic]);

  if (isLoading && !refreshing) return <LeaderboardSkeleton />;
  if (isError) return <ErrorSection message={t('leaderboard.couldNotLoad')} onRetry={() => refetch()} />;

  const isUserInList = currentUserEntry !== null;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Trophy className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{t('leaderboard.title')}</h1>
            <p className="text-yellow-100 text-sm">{t('leaderboard.subtitle')}</p>
          </div>
          <button
            onClick={handleShare}
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 active:scale-95 transition-transform"
            aria-label="Share leaderboard"
          >
            <Share2 className="w-6 h-6 text-white" aria-hidden="true" />
          </button>
        </div>
        <TimePeriodTabs timePeriod={timePeriod} onSelect={setTimePeriod} haptic={haptic} />
      </div>

      <div className="px-4 mt-6">
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
            <p className="text-telegram-hint">{t('leaderboard.noRankings')}</p>
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
                <span className="text-xs text-telegram-hint">{t('leaderboard.andBelow', { rank: 4 })}</span>
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
