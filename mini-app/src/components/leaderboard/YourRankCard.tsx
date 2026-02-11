import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '@/types';
import type { TimePeriod } from './TimePeriodTabs.js';
import { getXpValue, getXpLabel } from './TopThreeCard.js';
import { UserAvatar } from './UserAvatar.js';

interface YourRankCardProps {
  entry: LeaderboardEntry | null;
  rank: number | null;
  timePeriod: TimePeriod;
}

export function YourRankCard({ entry, rank, timePeriod }: YourRankCardProps) {
  if (!entry) {
    // bottom offset = nav bar height (72px) + safe area for notched devices
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-30"
        aria-label="Your rank: unranked"
      >
        <div className="rounded-2xl p-3 border border-yellow-500/30 bg-telegram-secondaryBg/80 backdrop-blur-xl shadow-lg shadow-yellow-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-telegram-hint/20 flex items-center justify-center text-telegram-hint font-bold text-sm flex-shrink-0" aria-hidden="true">
              ?
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm text-telegram-hint">
                You &mdash; Rank #?? &mdash; Keep climbing!
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  const xpValue = getXpValue(entry, timePeriod);
  const displayRank = rank ?? entry.xp_rank;

  // bottom offset = nav bar height (72px) + safe area for notched devices
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-3 right-3 z-30"
      aria-label={`Your rank: ${displayRank ? `#${displayRank}` : 'unranked'}, ${entry.first_name || entry.username || 'You'}, Level ${entry.level}, ${xpValue.toLocaleString()} ${getXpLabel(timePeriod)}`}
    >
      <div className="rounded-2xl p-3 border border-yellow-500/30 bg-telegram-secondaryBg/80 backdrop-blur-xl shadow-lg shadow-yellow-500/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-bold text-yellow-500 bg-yellow-500/10 rounded-lg px-2 py-1">
              {displayRank ? `#${displayRank}` : '#?'}
            </span>
          </div>
          <UserAvatar userId={entry.user_id} firstName={entry.first_name} username={entry.username} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-telegram-link truncate">
                {entry.first_name || entry.username || 'You'}
              </span>
              <span className="text-xs bg-telegram-link text-white px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
            </div>
            <span className="text-xs text-telegram-hint">Lv {entry.level}</span>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold">{xpValue.toLocaleString()}</div>
            <div className="text-xs text-telegram-hint">{getXpLabel(timePeriod)}</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
