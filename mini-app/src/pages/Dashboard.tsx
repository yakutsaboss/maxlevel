import { useEffect, useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { UserStats, Quest, UserMode, UserAchievement, Achievement } from '@/types';
import { Trophy, Zap, Target, Flame, TrendingUp, Compass, Scroll } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AchievementToast } from '@/components/AchievementToast';
import { QuestDifficultyBadge } from '@/components/QuestDifficultyBadge';
import { ErrorSection } from '@/components/ErrorSection';
import { DailyGoalRing } from '@/components/dashboard/DailyGoalRing';
import { TodaysProgress } from '@/components/dashboard/TodaysProgress';
import { StreakSection } from '@/components/dashboard/StreakSection';

const StatCard = memo(function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-2xl p-4 shadow-sm border border-telegram-hint/10" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2`}>{icon}</div>
      <div className="text-xs text-telegram-hint">{label}</div>
      <div className="text-xl font-bold text-telegram-text mt-1">{value}</div>
    </motion.div>
  );
});

const ModeCard = memo(function ModeCard({ userMode }: { userMode: UserMode }) {
  return (
    <motion.div className="flex-shrink-0 bg-telegram-secondaryBg rounded-xl px-4 py-2 border border-telegram-hint/20" whileHover={{ scale: 1.05 }}>
      <div className="text-2xl mb-1">{userMode.mode.icon}</div>
      <div className="text-sm font-medium">{userMode.mode.display_name}</div>
    </motion.div>
  );
});

const QuestCardMini = memo(function QuestCardMini({ quest, onClick }: { quest: Quest; onClick: () => void }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10" whileHover={{ scale: 1.02 }} onClick={onClick}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-telegram-text truncate">{quest.title}</h3>
          <p className="text-sm text-telegram-hint mt-1 line-clamp-2">{quest.description}</p>
        </div>
        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-600">{quest.xp_reward}</span>
        </div>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-telegram-hint mb-1"><span>Progress</span><span>{quest.progress} / {quest.target}</span></div>
        <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
          <motion.div className="h-full bg-telegram-link" initial={{ width: 0 }} animate={{ width: `${(quest.progress / quest.target) * 100}%` }} transition={{ duration: 0.5 }} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <QuestDifficultyBadge difficulty={quest.difficulty} />
        <span className="text-xs text-telegram-hint">{quest.frequency}</span>
      </div>
    </motion.div>
  );
});

const AchievementCard = memo(function AchievementCard({ userAch }: { userAch: UserAchievement }) {
  return (
    <motion.div className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-3xl text-center mb-2">{userAch.achievement.icon}</div>
      <div className="text-xs font-medium text-center">{userAch.achievement.name}</div>
    </motion.div>
  );
});

export function Dashboard() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);

  const checkForNewAchievements = async (userId: number) => {
    try {
      const res = await apiClient.checkAchievements(userId);
      if (res.success && res.data && res.data.newAchievements.length > 0) {
        const ach = res.data.newAchievements[0];
        setToastAchievement({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.badge_icon || ach.icon || '🏆',
          xp_reward: ach.xp_bonus || ach.xp_reward || 0,
          rarity: ach.rarity || 'common',
          category: ach.category || 'general',
        });
        haptic.notification('success');
      }
    } catch (err) {
      console.error('Achievement check failed:', err);
    }
  };

  const loadUserStats = async (checkAchievements = false) => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const response = await apiClient.getUserStats(user.id);
      if (response.success && response.data) {
        setStats(response.data);
        if (checkAchievements && response.data.user.id) {
          checkForNewAchievements(response.data.user.id).catch(console.error);
        }
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
      setError(true);
    } finally { setLoading(false); }
  };

  const handleRefresh = useCallback(async () => {
    await loadUserStats(true);
  }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => { loadUserStats(false); }, [user]);

  const handleQuestClick = useCallback((_questId: number) => { haptic.impact('light'); navigate('/quests'); }, [haptic, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-b-3xl">
          <div className="flex items-center justify-between mb-4">
            <div><div className="skeleton h-7 w-32 rounded-lg mb-2" /><div className="skeleton h-4 w-24 rounded-lg" /></div>
            <div className="skeleton w-16 h-16 rounded-2xl" />
          </div>
          <div className="skeleton h-8 w-full rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-3 px-4 -mt-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 shadow-sm border border-telegram-hint/10">
              <div className="skeleton w-10 h-10 rounded-xl mb-2" />
              <div className="skeleton-text h-3 w-16 mb-2">&nbsp;</div>
              <div className="skeleton-text h-6 w-12">&nbsp;</div>
            </div>
          ))}
        </div>
        <div className="px-4 mt-6">
          <div className="skeleton-text h-5 w-32 mb-3">&nbsp;</div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 bg-telegram-secondaryBg rounded-xl px-4 py-2 border border-telegram-hint/20 w-24">
                <div className="skeleton w-8 h-8 rounded-lg mx-auto mb-1" /><div className="skeleton-text h-3 w-full">&nbsp;</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 mt-6">
          <div className="skeleton-text h-5 w-32 mb-3">&nbsp;</div>
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
                <div className="skeleton-text h-5 w-3/4 mb-2">&nbsp;</div>
                <div className="skeleton-text h-3 w-full mb-3">&nbsp;</div>
                <div className="skeleton h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return <ErrorSection message="Could not load your dashboard data" onRetry={() => loadUserStats()} />;
  }

  const xpPercentage = (stats.user.xp / stats.user.xp_to_next_level) * 100;

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
            <h1 className="text-2xl font-bold text-white truncate">{stats.user.first_name}</h1>
            <p className="text-purple-100 text-sm truncate">{stats.user.username ? `@${stats.user.username}` : 'RPG Adventurer'}</p>
          </div>
          <motion.div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2 flex-shrink-0" whileHover={{ scale: 1.05 }}>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.user.level}</div>
              <div className="text-xs text-purple-100">Level</div>
            </div>
          </motion.div>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-full h-8 overflow-hidden">
          <div className="relative h-full">
            <motion.div className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500" initial={{ width: 0 }} animate={{ width: `${xpPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            <div className="absolute inset-0 flex items-center justify-center min-w-0 px-2">
              <span className="text-white text-sm font-semibold drop-shadow truncate">{stats.user.xp} / {stats.user.xp_to_next_level} XP</span>
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

      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-telegram-link" />Active Modes</h2>
        {stats.modes.length === 0 ? (
          <div className="text-center py-8 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Compass className="w-10 h-10 text-telegram-hint mx-auto mb-2" />
            <p className="text-telegram-hint text-sm">Pick a mode to start your journey</p>
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

      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Target className="w-5 h-5 text-telegram-link" />Active Quests</h2>
        <div className="space-y-3">
          {stats.activeQuests.length === 0 ? (
            <div className="text-center py-8 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
              <Scroll className="w-10 h-10 text-telegram-hint mx-auto mb-2" />
              <p className="text-telegram-hint text-sm">No quests yet. Pick a mode to get started!</p>
            </div>
          ) : (
            stats.activeQuests.map((quest) => (
              <QuestCardMini key={quest.id} quest={quest} onClick={() => handleQuestClick(quest.id)} />
            ))
          )}
        </div>
      </div>

      {stats.recentAchievements.length > 0 && (
        <div className="px-4 mt-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Trophy className="w-5 h-5 text-telegram-link" />Recent Achievements</h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.recentAchievements.slice(0, 4).map((userAch) => (
              <AchievementCard key={userAch.achievement_id} userAch={userAch} />
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
