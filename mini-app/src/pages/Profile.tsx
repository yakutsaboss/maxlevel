import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { UserStats, UserAchievement, Achievement } from '@/types';
import { Trophy, Award, TrendingUp, Calendar, Zap, AlertCircle, RefreshCw, Pencil, Settings } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileEditModal, AVATAR_OPTIONS } from '@/components/ProfileEditModal';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

export function Profile() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => { loadProfileData(); }, [user]);

  const loadProfileData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [statsRes, achievementsRes, allAchRes] = await Promise.all([
        apiClient.getUserStats(user.id),
        apiClient.getUserAchievements(user.id),
        apiClient.getAchievements(),
      ]);
      if (statsRes.success && statsRes.data) { setStats(statsRes.data); }
      if (achievementsRes.success && achievementsRes.data) { setAchievements(achievementsRes.data); }
      if (allAchRes.success && allAchRes.data) { setAllAchievements(allAchRes.data); }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setError(true);
    } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 rounded-b-3xl">
          <div className="text-center">
            <div className="skeleton w-24 h-24 rounded-full mx-auto mb-4" />
            <div className="skeleton h-7 w-40 rounded-lg mx-auto mb-2" />
            <div className="skeleton h-4 w-24 rounded-lg mx-auto mb-6" />
            <div className="flex justify-center gap-6 mt-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <div className="skeleton w-16 h-16 rounded-2xl mb-2" />
                  <div className="skeleton h-3 w-14 rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="px-4 mt-6"><div className="skeleton h-24 w-full rounded-2xl" /></div>
        <div className="px-4 mt-6">
          <div className="skeleton-text h-5 w-28 mb-3">&nbsp;</div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
                <div className="skeleton w-10 h-10 rounded-lg mx-auto mb-2" />
                <div className="skeleton-text h-4 w-20 mx-auto">&nbsp;</div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 mt-6 mb-6">
          <div className="skeleton-text h-5 w-36 mb-3">&nbsp;</div>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-3 border border-telegram-hint/10">
                <div className="skeleton w-10 h-10 rounded-lg mx-auto mb-2" />
                <div className="skeleton-text h-3 w-full">&nbsp;</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">Something went wrong</h3>
          <p className="text-sm text-red-500 mb-4">Could not load your profile</p>
          <button onClick={() => { haptic.impact('light'); loadProfileData(); }} className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 p-6 rounded-b-3xl shadow-lg relative">
        <button
          onClick={() => { haptic.impact('light'); navigate('/settings'); }}
          className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full p-2 active:scale-90 transition-transform z-10"
        >
          <Settings className="w-5 h-5 text-white" />
        </button>
        <div className="text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="inline-block relative mb-4">
            {(() => {
              const avatarIdx = Math.max(0, (stats.user.avatar_id ?? 1) - 1);
              const avatar = AVATAR_OPTIONS[avatarIdx] || AVATAR_OPTIONS[0];
              return (
                <div className={`w-24 h-24 ${avatar.color} rounded-full flex items-center justify-center shadow-xl`}>
                  <div className="text-white scale-[2]">{avatar.icon}</div>
                </div>
              );
            })()}
            <div className="absolute -bottom-2 -right-2 bg-yellow-400 rounded-full px-3 py-1 shadow-lg">
              <span className="text-sm font-bold text-purple-900">Lv {stats.user.level}</span>
            </div>
          </motion.div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white">{stats.user.first_name} {stats.user.last_name || ''}</h1>
            <button
              onClick={() => { haptic.impact('light'); setEditModalOpen(true); }}
              className="bg-white/20 backdrop-blur-sm rounded-full p-1.5 active:scale-90 transition-transform"
            >
              <Pencil className="w-4 h-4 text-white" />
            </button>
          </div>
          {stats.user.username && <p className="text-purple-100 text-sm mb-4">@{stats.user.username}</p>}
          <div className="flex justify-center gap-6 mt-6">
            <StatBadge icon={<Trophy className="w-5 h-5" />} value={stats.user.total_quests_completed} label="Quests" />
            <StatBadge icon={<Award className="w-5 h-5" />} value={achievements.length} label="Achievements" />
            <StatBadge icon={<Zap className="w-5 h-5" />} value={stats.user.xp} label="Total XP" />
          </div>
        </div>
      </div>

      <div className="px-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="w-5 h-5" />
                <h3 className="font-semibold">Streak</h3>
              </div>
              <div className="text-3xl font-bold">{stats.user.current_streak} days</div>
              <p className="text-sm text-orange-100 mt-1">Best: {stats.user.longest_streak} days</p>
            </div>
            <div className="text-6xl">🔥</div>
          </div>
        </motion.div>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-telegram-link" />My Modes
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {stats.modes.map((userMode, index) => (
            <motion.div key={userMode.mode_id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.1 }} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => haptic.impact('light')} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="text-4xl text-center mb-2">{userMode.mode.icon}</div>
              <h3 className="font-semibold text-center text-sm">{userMode.mode.display_name}</h3>
              <p className="text-xs text-telegram-hint text-center mt-1">Since {formatDate(userMode.activated_at)}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="px-4 mt-6 mb-6">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-telegram-link" />Achievements
        </h2>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-telegram-hint">Unlocked</span>
            <span className="text-sm font-bold">{achievements.length}/{allAchievements.length || achievements.length}</span>
          </div>
          {achievements.length > 0 ? (
            <div className="flex gap-3 mb-3">
              {achievements
                .sort((a, b) => new Date(b.unlocked_at).getTime() - new Date(a.unlocked_at).getTime())
                .slice(0, 3)
                .map((ua) => (
                  <div key={ua.achievement_id} className="flex items-center gap-1.5 bg-telegram-bg rounded-xl px-2.5 py-1.5">
                    <span className="text-lg">{ua.achievement.icon}</span>
                    <span className="text-xs font-medium line-clamp-1">{ua.achievement.name}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-telegram-hint mb-3">Complete quests to earn achievements!</p>
          )}
          <button
            onClick={() => { haptic.impact('light'); navigate('/achievements'); }}
            className="w-full py-2.5 rounded-xl bg-telegram-link/10 text-telegram-link text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            View all achievements
          </button>
        </motion.div>
      </div>

      <div className="px-4 mt-6 mb-6">
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
          <h3 className="font-semibold mb-3 text-sm text-telegram-hint">Account Info</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-telegram-hint">Telegram ID</span>
              <span className="font-mono">{stats.user.telegram_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">Joined</span>
              <span>{formatDate(stats.user.created_at)}</span>
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

      <ProfileEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSaved={() => loadProfileData()}
        telegramId={user!.id}
        currentName={stats.user.first_name}
        currentAvatarId={stats.user.avatar_id ?? 1}
        haptic={{ impact: haptic.impact, notification: haptic.notification, selection: haptic.selection }}
      />
    </div>
  );
}

function StatBadge({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <motion.div whileHover={{ scale: 1.1 }} className="text-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3 mb-2">
        <div className="text-white mb-1">{icon}</div>
        <div className="text-2xl font-bold text-white">{value}</div>
      </div>
      <div className="text-xs text-purple-100">{label}</div>
    </motion.div>
  );
}
