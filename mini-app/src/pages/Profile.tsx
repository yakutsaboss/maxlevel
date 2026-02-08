import { useEffect, useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { UserStats, UserAchievement } from '@/types';
import { Trophy, Award, TrendingUp, Calendar, Zap, Star } from 'lucide-react';
import { motion } from 'framer-motion';

export function Profile() {
  const { user, haptic } = useTelegram();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [statsRes, achievementsRes] = await Promise.all([
        apiClient.getUserStats(user.id),
        apiClient.getUserAchievements(user.id),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data);
      }
      if (achievementsRes.success && achievementsRes.data) {
        setAchievements(achievementsRes.data);
      }
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <div className="text-telegram-hint">Loading profile...</div>
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

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      {/* Profile Header */}
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 rounded-b-3xl shadow-lg">
        <div className="text-center">
          {/* Avatar */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="inline-block relative mb-4"
          >
            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-4xl font-bold text-purple-600 shadow-xl">
              {stats.user.first_name.charAt(0).toUpperCase()}
            </div>
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full px-3 py-1 shadow-lg">
              <span className="text-sm font-bold text-purple-900">
                Lv {stats.user.level}
              </span>
            </div>
          </motion.div>

          {/* Name */}
          <h1 className="text-2xl font-bold text-white mb-1">
            {stats.user.first_name} {stats.user.last_name || ''}
          </h1>
          {stats.user.username && (
            <p className="text-purple-100 text-sm mb-4">@{stats.user.username}</p>
          )}

          {/* Stats Row */}
          <div className="flex justify-center gap-6 mt-6">
            <StatBadge
              icon={<Trophy className="w-5 h-5" />}
              value={stats.user.total_quests_completed}
              label="Quests"
            />
            <StatBadge
              icon={<Award className="w-5 h-5" />}
              value={achievements.length}
              label="Achievements"
            />
            <StatBadge
              icon={<Zap className="w-5 h-5" />}
              value={stats.user.xp}
              label="Total XP"
            />
          </div>
        </div>
      </div>

      {/* Streak Section */}
      <div className="px-4 mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5" />
                <h3 className="font-semibold">Streak</h3>
              </div>
              <div className="text-3xl font-bold">
                {stats.user.current_streak} days 🔥
              </div>
              <p className="text-sm text-orange-100 mt-1">
                Best: {stats.user.longest_streak} days
              </p>
            </div>
            <div className="text-6xl">🔥</div>
          </div>
        </motion.div>
      </div>

      {/* Active Modes */}
      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-telegram-link" />
          My Modes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.modes.map((userMode, index) => (
            <motion.div
              key={userMode.mode_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
            >
              <div className="text-4xl text-center mb-2">{userMode.mode.icon}</div>
              <h3 className="font-semibold text-center text-sm">
                {userMode.mode.display_name}
              </h3>
              <p className="text-xs text-telegram-hint text-center mt-1">
                Since {new Date(userMode.activated_at).toLocaleDateString()}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Achievements Section */}
      <div className="px-4 mt-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-telegram-link" />
          Achievements ({achievements.length})
        </h2>

        {achievements.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-telegram-hint">
              No achievements yet. Complete quests to unlock!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((userAch, index) => (
              <motion.div
                key={userAch.achievement_id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: index * 0.05,
                  type: 'spring',
                  stiffness: 200,
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic.impact('light');
                }}
                className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10 cursor-pointer"
              >
                <div className="text-4xl text-center mb-2">
                  {userAch.achievement.icon}
                </div>
                <p className="text-xs text-center font-medium line-clamp-2">
                  {userAch.achievement.name}
                </p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <Star className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600 font-semibold">
                    {userAch.achievement.xp_reward}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Account Info */}
      <div className="px-4 mt-6 mb-6">
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
          <h3 className="font-semibold mb-3 text-sm text-telegram-hint">
            Account Info
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-telegram-hint">Telegram ID</span>
              <span className="font-mono">{stats.user.telegram_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Joined</span>
              <span>{new Date(stats.user.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Total XP</span>
              <span className="font-semibold">{stats.user.xp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Level</span>
              <span className="font-semibold">{stats.user.level}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Badge Component
function StatBadge({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className="text-center"
    >
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-2">
        <div className="text-white mb-1">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-purple-100">{label}</div>
    </motion.div>
  );
}
