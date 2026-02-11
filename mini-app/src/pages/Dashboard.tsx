import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useDashboardData } from '@/hooks/useDashboardData';
import { PullIndicator } from '@/hooks/usePullToRefresh';
import { Trophy, Zap, Target, Flame, TrendingUp, Compass, Scroll, Sparkles, ArrowRight, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementToast } from '@/components/AchievementToast';
import { ErrorSection } from '@/components/ErrorSection';
import { DailyGoalRing } from '@/components/dashboard/DailyGoalRing';
import { TodaysProgress } from '@/components/dashboard/TodaysProgress';
import { StreakSection } from '@/components/dashboard/StreakSection';
import { StatCard } from '@/components/dashboard/StatCard';
import { ModeCard } from '@/components/dashboard/ModeCard';
import { QuestCardMini } from '@/components/dashboard/QuestCardMini';
import { DashboardAchievementCard } from '@/components/dashboard/DashboardAchievementCard';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton';
import { getDailyQuote } from '@/data/motivationalQuotes';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function Dashboard() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const {
    stats, loading, error,
    toastAchievement, setToastAchievement,
    loadUserStats,
    containerRef, pullDistance, refreshing, pullThreshold, touchHandlers,
    handleQuestClick,
  } = useDashboardData({ userId: user?.id, haptic });

  const dailyQuote = useMemo(() => getDailyQuote(), []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error || !stats) {
    return <ErrorSection message="Could not load your dashboard data" onRetry={() => loadUserStats()} />;
  }

  const xpPercentage = stats.user.xp_to_next_level > 0 ? Math.min((stats.user.xp / stats.user.xp_to_next_level) * 100, 100) : 0;
  const xpNeeded = Math.max(0, stats.user.xp_to_next_level - stats.user.xp);
  const nextLevel = stats.user.level + 1;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="text-2xl font-bold text-white truncate">{getGreeting()}, {stats.user.first_name}!</h1>
            <p className="text-purple-100 text-sm truncate">{stats.user.username ? `@${stats.user.username}` : 'RPG Adventurer'}</p>
          </div>
          <motion.div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex-shrink-0" whileHover={{ scale: 1.05 }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.user.level}</div>
              <div className="text-xs text-purple-100">Level</div>
            </div>
          </motion.div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-full h-8 overflow-hidden" role="progressbar" aria-valuenow={stats.user.xp} aria-valuemin={0} aria-valuemax={stats.user.xp_to_next_level} aria-label={`XP progress: ${stats.user.xp} of ${stats.user.xp_to_next_level}`}>
          <div className="relative h-full">
            <motion.div className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500" initial={{ width: 0 }} animate={{ width: `${xpPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            <div className="absolute inset-0 flex items-center justify-center min-w-0 px-2">
              <span className="text-white text-sm font-semibold drop-shadow truncate">{stats.user.xp} / {stats.user.xp_to_next_level} XP</span>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-1 mt-2">
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span className="text-purple-100 text-xs font-medium">{xpNeeded} XP to Level {nextLevel}</span>
        </div>
      </div>

      {/* Motivational Quote */}
      <div className="mx-4 -mt-4 relative z-10" role="complementary" aria-label="Daily motivational quote">
        <div className="bg-telegram-secondaryBg/80 backdrop-blur-sm rounded-2xl px-4 py-3 border border-telegram-hint/10">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm text-telegram-text italic leading-snug">{dailyQuote.text}</p>
              <p className="text-xs text-telegram-hint mt-1">— {dailyQuote.author}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 -mt-8">
        <StatCard icon={<Target className="w-5 h-5" />} label="Quests Done" value={stats.user.total_quests_completed} color="bg-blue-500" />
        <StatCard icon={<Flame className="w-5 h-5" />} label="Longest Streak" value={`${stats.streakData.longest} days`} color="bg-orange-500" />
        <StatCard icon={<Zap className="w-5 h-5" />} label="Total XP" value={stats.user.xp} color="bg-yellow-500" />
        <StatCard icon={<Trophy className="w-5 h-5" />} label="Achievements" value={stats.recentAchievements.length} color="bg-purple-500" />
      </div>

      <DailyGoalRing completedToday={stats.completedQuestsToday} totalDaily={stats.activeQuests.length + stats.completedQuestsToday} />

      <TodaysProgress completedToday={stats.completedQuestsToday} xpGainedToday={stats.xpGainedToday} activeQuestsCount={stats.activeQuests.length} />

      <div className="px-4 mt-6" role="region" aria-label="Active modes">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-telegram-link" aria-hidden="true" />Active Modes</h2>
        {stats.modes.length === 0 ? (
          <div className="text-center py-8 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Compass className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-text font-medium mb-1">Your adventure awaits!</p>
            <p className="text-telegram-hint text-sm mb-4">Choose a mode to unlock quests and start leveling up</p>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full"
            >
              Choose a Mode <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {stats.modes.map((userMode) => (
              <ModeCard key={userMode.mode_id} userMode={userMode} />
            ))}
          </div>
        )}
      </div>

      <StreakSection streakData={stats.streakData} perModeStreaks={stats.perModeStreaks} />

      <div className="px-4 mt-6" role="region" aria-label="Active quests">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-telegram-link" aria-hidden="true" />Active Quests</h2>
        <div className="space-y-3">
          {stats.activeQuests.length === 0 ? (
            <div className="text-center py-8 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
              <Scroll className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
              <p className="text-telegram-text font-medium mb-1">No active quests right now</p>
              <p className="text-telegram-hint text-sm mb-4">Complete your daily goals or check in tomorrow for fresh challenges</p>
              <button
                onClick={() => navigate('/quests')}
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium px-4 py-2 rounded-full"
              >
                View Quests <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            stats.activeQuests.map((quest) => (
              <QuestCardMini key={quest.id} quest={quest} onClick={() => handleQuestClick(quest.id)} />
            ))
          )}
        </div>
      </div>

      {stats.recentAchievements.length > 0 && (
        <div className="px-4 mt-6 mb-6" role="region" aria-label="Recent achievements">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-telegram-link" aria-hidden="true" />Recent Achievements</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.recentAchievements.slice(0, 4).map((userAch) => (
              <DashboardAchievementCard key={userAch.achievement_id} userAch={userAch} />
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {toastAchievement && (
          <AchievementToast
            achievement={toastAchievement}
            onClose={() => setToastAchievement(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
