import { useEffect, useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { UserStats } from '@/types';
import { Trophy, Zap, Target, Flame, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export function Dashboard() {
  const { user, haptic } = useTelegram();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, [user]);

  const loadUserStats = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.getUserStats(user.id);
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestClick = (_questId: number) => {
    haptic.impact('light');
    // Navigate to quest details
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint">Loading...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint">No data available</div>
      </div>
    );
  }

  const xpPercentage = (stats.user.xp / stats.user.xp_to_next_level) * 100;

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {stats.user.first_name}
            </h1>
            <p className="text-purple-100 text-sm">
              {stats.user.username ? `@${stats.user.username}` : 'RPG Adventurer'}
            </p>
          </div>
          <motion.div
            className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {stats.user.level}
              </div>
              <div className="text-xs text-purple-100">Level</div>
            </div>
          </motion.div>
        </div>

        {/* XP Progress Bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-full h-8 overflow-hidden">
          <div className="relative h-full">
            <motion.div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercentage}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white text-sm font-semibold drop-shadow">
                {stats.user.xp} / {stats.user.xp_to_next_level} XP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 px-4 -mt-8">
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Quests Done"
          value={stats.user.total_quests_completed}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Current Streak"
          value={`${stats.user.current_streak} days`}
          color="bg-orange-500"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="XP Today"
          value={`+${stats.xpGainedToday}`}
          color="bg-yellow-500"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="Achievements"
          value={stats.recentAchievements.length}
          color="bg-purple-500"
        />
      </div>

      {/* Active Modes */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-telegram-link" />
          Active Modes
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {stats.modes.map((userMode) => (
            <motion.div
              key={userMode.mode_id}
              className="flex-shrink-0 bg-telegram-secondaryBg rounded-xl px-4 py-2 border border-telegram-hint/20"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl mb-1">{userMode.mode.icon}</div>
              <div className="text-sm font-medium">{userMode.mode.display_name}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Active Quests */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-telegram-link" />
          Active Quests
        </h2>
        <div className="space-y-3">
          {stats.activeQuests.length === 0 ? (
            <div className="text-center py-8 text-telegram-hint">
              No active quests. Complete onboarding to get started!
            </div>
          ) : (
            stats.activeQuests.map((quest) => (
              <motion.div
                key={quest.id}
                className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
                whileHover={{ scale: 1.02 }}
                onClick={() => handleQuestClick(quest.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-telegram-text">{quest.title}</h3>
                    <p className="text-sm text-telegram-hint mt-1">{quest.description}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold text-yellow-600">
                      {quest.xp_reward}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-telegram-hint mb-1">
                    <span>Progress</span>
                    <span>
                      {quest.progress} / {quest.target}
                    </span>
                  </div>
                  <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
                    <motion.div
                      className="h-full bg-telegram-link"
                      initial={{ width: 0 }}
                      animate={{ width: `${(quest.progress / quest.target) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Difficulty Badge */}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      quest.difficulty === 'easy'
                        ? 'bg-green-100 text-green-700'
                        : quest.difficulty === 'medium'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {quest.difficulty}
                  </span>
                  <span className="text-xs text-telegram-hint">
                    {quest.frequency}
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Recent Achievements */}
      {stats.recentAchievements.length > 0 && (
        <div className="px-4 mt-6 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-telegram-link" />
            Recent Achievements
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {stats.recentAchievements.slice(0, 4).map((userAch) => (
              <motion.div
                key={userAch.achievement_id}
                className="bg-telegram-secondaryBg rounded-xl p-3 border border-telegram-hint/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="text-3xl text-center mb-2">{userAch.achievement.icon}</div>
                <div className="text-xs font-medium text-center">{userAch.achievement.name}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <motion.div
      className="bg-telegram-secondaryBg rounded-2xl p-4 shadow-sm border border-telegram-hint/10"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className={`${color} w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2`}>
        {icon}
      </div>
      <div className="text-xs text-telegram-hint">{label}</div>
      <div className="text-xl font-bold text-telegram-text mt-1">{value}</div>
    </motion.div>
  );
}
