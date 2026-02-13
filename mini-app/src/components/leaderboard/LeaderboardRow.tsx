import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '@/types';
import type { TimePeriod } from './TimePeriodTabs.js';
import { RankIcon, TrendArrow, getXpValue, getXpLabel } from './TopThreeCard.js';
import type { TrendDirection } from './TopThreeCard.js';
import { UserAvatar } from './UserAvatar.js';

interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  timePeriod: TimePeriod;
  index: number;
  trend?: TrendDirection;
}

export function LeaderboardRow({ entry, rank, isCurrentUser, timePeriod, index, trend = 'none' }: LeaderboardRowProps) {
  const xpValue = getXpValue(entry, timePeriod);

  return (
    <motion.div
      key={entry.user_id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: (index + 3) * 0.03 }}
      role="row"
      aria-label={`Rank ${rank}: ${entry.first_name || entry.username || 'Adventurer'}, Level ${entry.level}, ${xpValue.toLocaleString()} ${getXpLabel(timePeriod)}${isCurrentUser ? ' (You)' : ''}`}
      className={`rounded-2xl p-3 flex items-center gap-3 border-2 transition-colors ${
        isCurrentUser
          ? 'bg-telegram-link/10 border-telegram-link'
          : 'bg-telegram-secondaryBg border-transparent'
      }`}
    >
      <div className="w-8 flex-shrink-0 flex flex-col items-center gap-0.5" aria-hidden="true">
        <RankIcon rank={rank} />
        <TrendArrow trend={trend} />
      </div>
      <UserAvatar userId={entry.user_id} firstName={entry.first_name} username={entry.username} avatarId={entry.avatar_id} size="md" />
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
        <div className="text-xs text-telegram-hint">{getXpLabel(timePeriod)}</div>
      </div>
    </motion.div>
  );
}
