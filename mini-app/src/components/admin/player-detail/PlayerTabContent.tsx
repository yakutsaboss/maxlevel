import { memo } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, Target, Scroll, Award, DollarSign, Users,
  CheckCircle2, Trophy, Dumbbell, BookOpen, Star, Activity,
  ChevronRight, TrendingUp, XCircle,
} from 'lucide-react';
import { formatDate } from '@/utils/formatDate';
import { relativeTime } from './helpers';
import type { PlayerDetailData } from './types';

function eventIcon(type: string): React.ReactNode {
  switch (type) {
    case 'quest_complete': return <CheckCircle2 size={14} className="text-green-400" />;
    case 'achievement': return <Trophy size={14} className="text-yellow-400" />;
    case 'activity': return <Dumbbell size={14} className="text-blue-400" />;
    case 'content_read': return <BookOpen size={14} className="text-purple-400" />;
    case 'level_up': return <Star size={14} className="text-amber-400" />;
    default: return <Activity size={14} className="text-telegram-hint" />;
  }
}

export function TabSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4">
          <div className="h-4 bg-telegram-hint/15 rounded w-3/4 mb-2" />
          <div className="h-3 bg-telegram-hint/10 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

export const TimelineTab = memo(function TimelineTab({ data }: { data: PlayerDetailData }) {
  const events = data.recentActivities;

  if (events.length === 0) {
    return (
      <div className="text-center py-10 text-telegram-hint">
        <Clock size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((event, i) => (
        <motion.div
          key={event.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.04 }}
          className="flex items-start gap-3 bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10"
        >
          <div className="w-8 h-8 bg-telegram-bg rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            {eventIcon(event.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-telegram-text truncate">{event.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-telegram-hint">{relativeTime(event.created_at)}</span>
              {event.xp_earned > 0 && (
                <span className="text-[11px] text-yellow-500 font-medium">+{event.xp_earned} XP</span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
});

export const ModesTab = memo(function ModesTab({ data }: { data: PlayerDetailData }) {
  if (data.modes.length === 0) {
    return (
      <div className="text-center py-10 text-telegram-hint">
        <Target size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No active modes</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.modes.map((mode, i) => (
        <motion.div
          key={mode.mode_name}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className="bg-telegram-secondaryBg rounded-xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-telegram-text capitalize">{mode.mode_name}</span>
            <span className="text-xs text-telegram-hint">
              Joined {formatDate(mode.joined_at)}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="text-center">
              <div className="text-sm font-bold text-telegram-text">{mode.quests_completed}/{mode.quests_total}</div>
              <div className="text-[10px] text-telegram-hint">Quests</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-telegram-text">{Math.round(mode.quest_completion_rate)}%</div>
              <div className="text-[10px] text-telegram-hint">Rate</div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-telegram-text">{mode.current_streak}d</div>
              <div className="text-[10px] text-telegram-hint">Streak</div>
            </div>
          </div>
          <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${mode.quest_completion_rate}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="h-full bg-telegram-button rounded-full"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
});

export const QuestsTab = memo(function QuestsTab({ data }: { data: PlayerDetailData }) {
  if (data.recentQuests.length === 0) {
    return (
      <div className="text-center py-10 text-telegram-hint">
        <Scroll size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No quest history</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 text-[10px] text-telegram-hint uppercase font-medium">
        <span>Quest</span>
        <span>Status</span>
        <span>Date</span>
        <span>XP</span>
      </div>
      {data.recentQuests.map((quest, i) => (
        <motion.div
          key={quest.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03 }}
          className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-telegram-secondaryBg rounded-xl px-3 py-2.5 border border-telegram-hint/10"
        >
          <span className="text-sm text-telegram-text truncate">{quest.quest_name}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            quest.status === 'completed'
              ? 'bg-green-500/15 text-green-400'
              : quest.status === 'active'
              ? 'bg-blue-500/15 text-blue-400'
              : 'bg-red-500/15 text-red-400'
          }`}>
            {quest.status}
          </span>
          <span className="text-[11px] text-telegram-hint whitespace-nowrap">
            {quest.completed_at ? formatDate(quest.completed_at) : formatDate(quest.started_at)}
          </span>
          <span className="text-[11px] text-yellow-500 font-medium text-right">
            {quest.xp_earned > 0 ? `+${quest.xp_earned}` : '—'}
          </span>
        </motion.div>
      ))}
    </div>
  );
});

export const AchievementsTab = memo(function AchievementsTab({ data }: { data: PlayerDetailData }) {
  const unlocked = data.achievements.filter(a => a.unlocked_at);
  const locked = data.achievements.filter(a => !a.unlocked_at);

  return (
    <div className="space-y-4">
      {unlocked.length > 0 && (
        <div>
          <h4 className="text-xs text-telegram-hint uppercase font-medium mb-2 px-1">
            Unlocked ({unlocked.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {unlocked.map((ach, i) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10 text-center"
              >
                <div className="text-2xl mb-1">{ach.icon || '🏆'}</div>
                <div className="text-[11px] font-medium text-telegram-text truncate">{ach.name}</div>
                <div className="text-[9px] text-telegram-hint mt-0.5">
                  {ach.unlocked_at ? formatDate(ach.unlocked_at) : ''}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <h4 className="text-xs text-telegram-hint uppercase font-medium mb-2 px-1">
            Locked ({locked.length})
          </h4>
          <div className="grid grid-cols-3 gap-2">
            {locked.map((ach) => (
              <div
                key={ach.id}
                className="bg-telegram-secondaryBg/50 rounded-xl p-3 border border-telegram-hint/5 text-center opacity-40"
              >
                <div className="text-2xl mb-1 grayscale">{ach.icon || '🔒'}</div>
                <div className="text-[11px] font-medium text-telegram-hint truncate">{ach.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.achievements.length === 0 && (
        <div className="text-center py-10 text-telegram-hint">
          <Award size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm">No achievements data</p>
        </div>
      )}
    </div>
  );
});

export const FinanceTab = memo(function FinanceTab({ data }: { data: PlayerDetailData }) {
  const { finance } = data;

  if (!finance.has_finance_mode) {
    return (
      <div className="text-center py-10 text-telegram-hint">
        <DollarSign size={32} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">Finance mode not active</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-telegram-secondaryBg rounded-xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-[11px] text-telegram-hint">Income</span>
          </div>
          <div className="text-lg font-bold text-green-400">${finance.total_income.toLocaleString()}</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-telegram-secondaryBg rounded-xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-2 mb-1">
            <XCircle size={14} className="text-red-400" />
            <span className="text-[11px] text-telegram-hint">Expenses</span>
          </div>
          <div className="text-lg font-bold text-red-400">${finance.total_expenses.toLocaleString()}</div>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="bg-telegram-secondaryBg rounded-xl p-4 border border-telegram-hint/10"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-telegram-hint">Savings Rate</span>
          <span className="text-sm font-bold text-telegram-text">{finance.savings_rate}%</span>
        </div>
        <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(finance.savings_rate, 100)}%` }}
            transition={{ duration: 0.6 }}
            className="h-full bg-green-500 rounded-full"
          />
        </div>
        <div className="text-[11px] text-telegram-hint mt-2">{finance.budget_count} active budget(s)</div>
      </motion.div>
    </div>
  );
});

export const SocialTab = memo(function SocialTab({ data }: { data: PlayerDetailData }) {
  const { stats } = data;

  const socialCards = [
    { label: 'Friends', value: stats.friends_count, icon: <Users size={16} className="text-blue-400" />, color: 'bg-blue-500/15' },
    { label: 'Challenges Sent', value: stats.challenges_sent, icon: <ChevronRight size={16} className="text-green-400" />, color: 'bg-green-500/15' },
    { label: 'Challenges Received', value: stats.challenges_received, icon: <ChevronRight size={16} className="text-purple-400 rotate-180" />, color: 'bg-purple-500/15' },
    { label: 'Leaderboard Rank', value: stats.leaderboard_rank ?? '—', icon: <Trophy size={16} className="text-yellow-400" />, color: 'bg-yellow-500/15' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {socialCards.map((card, i) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10"
        >
          <div className={`w-8 h-8 ${card.color} rounded-lg flex items-center justify-center mb-2`}>
            {card.icon}
          </div>
          <div className="text-lg font-bold text-telegram-text">{card.value}</div>
          <div className="text-[11px] text-telegram-hint">{card.label}</div>
        </motion.div>
      ))}
    </div>
  );
});
