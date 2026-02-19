import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, User, Shield, Zap, Target, Trophy, Flame, Activity,
  Clock, Scroll, Award, DollarSign, Users, ChevronRight,
  AlertCircle, Star, BookOpen, Dumbbell, CheckCircle2, XCircle,
  TrendingUp, Calendar,
} from 'lucide-react';
import { adminFetch } from '@/api/adminClient';
import { formatDate } from '@/utils/formatDate';

// ── Types ──────────────────────────────────────────────────────────────

interface PlayerUser {
  id: number;
  telegram_id: number;
  display_name: string;
  username: string | null;
  first_name: string;
  tier: string;
  level: number;
  xp: number;
  current_streak: number;
  longest_streak: number;
  created_at: string;
  last_active: string;
  avatar_id: number | null;
  status: string;
}

interface PlayerMode {
  mode_name: string;
  joined_at: string;
  quest_completion_rate: number;
  current_streak: number;
  quests_completed: number;
  quests_total: number;
}

interface QuestInstance {
  id: number;
  quest_name: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  xp_earned: number;
}

interface PlayerAchievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  unlocked_at: string | null;
}

interface ActivityEvent {
  id: number;
  type: string;
  description: string;
  xp_earned: number;
  created_at: string;
  icon?: string;
}

interface PlayerStats {
  total_quests: number;
  total_achievements: number;
  total_activities: number;
  articles_read: number;
  total_xp_earned: number;
  friends_count: number;
  challenges_sent: number;
  challenges_received: number;
  leaderboard_rank: number | null;
}

interface FinanceSummary {
  has_finance_mode: boolean;
  total_income: number;
  total_expenses: number;
  savings_rate: number;
  budget_count: number;
}

interface PlayerDetailData {
  user: PlayerUser;
  modes: PlayerMode[];
  recentQuests: QuestInstance[];
  achievements: PlayerAchievement[];
  recentActivities: ActivityEvent[];
  stats: PlayerStats;
  finance: FinanceSummary;
}

// ── Tab types ──────────────────────────────────────────────────────────

type TabId = 'overview' | 'timeline' | 'modes' | 'quests' | 'achievements' | 'finance' | 'social' | 'actions';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Activity size={14} /> },
  { id: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
  { id: 'modes', label: 'Modes', icon: <Target size={14} /> },
  { id: 'quests', label: 'Quests', icon: <Scroll size={14} /> },
  { id: 'achievements', label: 'Achievements', icon: <Award size={14} /> },
  { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
  { id: 'social', label: 'Social', icon: <Users size={14} /> },
  { id: 'actions', label: 'Admin', icon: <Shield size={14} /> },
];

// ── Helpers ─────────────────────────────────────────────────────────────

function tierColor(tier: string): string {
  switch (tier) {
    case 'premium': return 'bg-yellow-500 text-white';
    case 'subscriber': return 'bg-blue-500 text-white';
    default: return 'bg-telegram-hint/20 text-telegram-hint';
  }
}

function xpForLevel(level: number): number {
  return level * 100;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}

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

// ── Skeleton ────────────────────────────────────────────────────────────

function TabSkeleton() {
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

// ── Tab Content Components ──────────────────────────────────────────────

function OverviewTab({ data }: { data: PlayerDetailData }) {
  const { stats } = data;
  const cards = [
    { label: 'Total Quests', value: stats.total_quests, icon: <Target size={16} className="text-green-400" />, color: 'bg-green-500/15' },
    { label: 'Streak', value: `${data.user.current_streak}d`, icon: <Flame size={16} className="text-orange-400" />, color: 'bg-orange-500/15' },
    { label: 'Achievements', value: stats.total_achievements, icon: <Trophy size={16} className="text-yellow-400" />, color: 'bg-yellow-500/15' },
    { label: 'Total XP', value: stats.total_xp_earned.toLocaleString(), icon: <Zap size={16} className="text-blue-400" />, color: 'bg-blue-500/15' },
    { label: 'Activities', value: stats.total_activities, icon: <Dumbbell size={16} className="text-purple-400" />, color: 'bg-purple-500/15' },
    { label: 'Articles Read', value: stats.articles_read, icon: <BookOpen size={16} className="text-teal-400" />, color: 'bg-teal-500/15' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => (
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
}

function TimelineTab({ data }: { data: PlayerDetailData }) {
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
}

function ModesTab({ data }: { data: PlayerDetailData }) {
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
          {/* Completion bar */}
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
}

function QuestsTab({ data }: { data: PlayerDetailData }) {
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
}

function AchievementsTab({ data }: { data: PlayerDetailData }) {
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
}

function FinanceTab({ data }: { data: PlayerDetailData }) {
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
}

function SocialTab({ data }: { data: PlayerDetailData }) {
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
}

function ActionsTab({ userId }: { userId: number }) {
  // Placeholder — Agent D creates AdminPlayerActions component
  // When merged, this will be: <AdminPlayerActions userId={userId} ... />
  return (
    <div className="text-center py-10 text-telegram-hint">
      <Shield size={32} className="mx-auto mb-2 opacity-40" />
      <p className="text-sm">Admin actions for user #{userId}</p>
      <p className="text-xs mt-1">Award XP, Change Tier, Send Message, etc.</p>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────

export function AdminPlayerDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<PlayerDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const credentials = sessionStorage.getItem('admin_credentials') || '';

  const loadPlayerData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/players/${userId}`, credentials);
      if (!res.ok) {
        throw new Error(res.status === 404 ? 'Player not found' : `Failed to load player (${res.status})`);
      }
      const json = await res.json();
      setData(json.data || json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, credentials]);

  useEffect(() => {
    loadPlayerData();
  }, [loadPlayerData]);

  // ── Loading state ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-telegram-hint/15 rounded w-32" />
          <div className="bg-telegram-secondaryBg rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-telegram-hint/15 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-telegram-hint/15 rounded w-40" />
                <div className="h-3 bg-telegram-hint/10 rounded w-24" />
              </div>
            </div>
            <div className="h-2 bg-telegram-hint/10 rounded-full" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-telegram-hint/10 rounded-lg flex-1" />
            ))}
          </div>
          <TabSkeleton />
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-telegram-bg flex items-center justify-center p-4">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto mb-3 text-red-400" />
          <p className="text-sm text-red-400 mb-3">{error || 'Failed to load player'}</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 text-sm text-telegram-link border border-telegram-link/30 rounded-xl"
            >
              Go Back
            </button>
            <button
              onClick={loadPlayerData}
              className="px-4 py-2 text-sm bg-telegram-button text-telegram-buttonText rounded-xl"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { user } = data;
  const xpNeeded = xpForLevel(user.level);
  const xpProgress = xpNeeded > 0 ? Math.min((user.xp % xpNeeded) / xpNeeded * 100, 100) : 0;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-6">
      {/* Breadcrumb */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-telegram-link"
        >
          <ArrowLeft size={16} />
          <span>Players</span>
          <ChevronRight size={12} className="text-telegram-hint" />
          <span className="text-telegram-text font-medium truncate max-w-[180px]">
            {user.display_name || user.first_name}
          </span>
        </button>
      </div>

      {/* Player Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-telegram-button/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-telegram-button" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-telegram-text truncate">
                {user.display_name || user.first_name}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${tierColor(user.tier)}`}>
                {user.tier}
              </span>
            </div>
            <div className="text-sm text-telegram-hint">
              {user.username ? `@${user.username}` : `ID: ${user.telegram_id}`}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-telegram-hint flex items-center gap-1">
                <Calendar size={10} /> {formatDate(user.created_at)}
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                user.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
              }`}>
                {user.status}
              </span>
            </div>
          </div>
        </div>

        {/* Level + XP bar */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-telegram-hint">Lv.{user.level}</span>
          <div className="flex-1 h-2 bg-telegram-bg rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${xpProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-telegram-button to-telegram-link rounded-full"
            />
          </div>
          <span className="text-xs text-telegram-hint">{user.xp.toLocaleString()} XP</span>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="px-4 mt-4 mb-3">
        <div
          className="flex gap-1 overflow-x-auto hide-scrollbar pb-1"
          role="tablist"
          aria-label="Player detail tabs"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                activeTab === tab.id
                  ? 'bg-telegram-button text-telegram-buttonText'
                  : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/10'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && <OverviewTab data={data} />}
            {activeTab === 'timeline' && <TimelineTab data={data} />}
            {activeTab === 'modes' && <ModesTab data={data} />}
            {activeTab === 'quests' && <QuestsTab data={data} />}
            {activeTab === 'achievements' && <AchievementsTab data={data} />}
            {activeTab === 'finance' && <FinanceTab data={data} />}
            {activeTab === 'social' && <SocialTab data={data} />}
            {activeTab === 'actions' && <ActionsTab userId={data.user.id} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
