import { Trophy, Medal, Award } from 'lucide-react';
import { motion } from 'framer-motion';
import type { LeaderboardEntry } from '@/types';
import type { TimePeriod } from './TimePeriodTabs.js';
import { UserAvatar } from './UserAvatar.js';

export type TrendDirection = 'up' | 'down' | 'same' | 'none';

export function TrendArrow({ trend }: { trend: TrendDirection }) {
  if (trend === 'up') return <span className="text-green-400 text-xs font-bold ml-0.5">&#8593;</span>;
  if (trend === 'down') return <span className="text-red-400 text-xs font-bold ml-0.5">&#8595;</span>;
  if (trend === 'same') return <span className="text-telegram-hint text-xs ml-0.5">=</span>;
  return <span className="text-telegram-hint text-xs ml-0.5">&mdash;</span>;
}

export function RankIcon({ rank, isTop }: { rank: number; isTop?: boolean }) {
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

interface TopThreeCardProps {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
  timePeriod: TimePeriod;
  index: number;
  trend?: TrendDirection;
}

export function getXpValue(entry: LeaderboardEntry, timePeriod: TimePeriod): number {
  if (timePeriod === 'weekly' && entry.weekly_xp != null) return entry.weekly_xp;
  if (timePeriod === 'monthly' && entry.monthly_xp != null) return entry.monthly_xp;
  return entry.total_xp;
}

export function getXpLabel(timePeriod: TimePeriod): string {
  if (timePeriod === 'weekly') return 'Weekly XP';
  if (timePeriod === 'monthly') return 'Monthly XP';
  return 'XP';
}

export function TopThreeCard({ entry, rank, isCurrentUser, timePeriod, index, trend = 'none' }: TopThreeCardProps) {
  const rankStyle = TOP_RANK_STYLES[rank];
  const xpValue = getXpValue(entry, timePeriod);

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
      <div className="w-9 flex-shrink-0 flex flex-col items-center gap-0.5">
        <RankIcon rank={rank} isTop />
        <TrendArrow trend={trend} />
      </div>
      <UserAvatar userId={entry.user_id} firstName={entry.first_name} username={entry.username} size="lg" />
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
        <div className="text-xs text-telegram-hint">{getXpLabel(timePeriod)}</div>
      </div>
    </motion.div>
  );
}
