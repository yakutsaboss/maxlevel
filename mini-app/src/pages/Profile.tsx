import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { UserStats, UserAchievement, Achievement } from '@/types';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Toast } from '@/components/Toast';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileModes } from '@/components/profile/ProfileModes';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfileAccountability } from '@/components/profile/ProfileAccountability';
import { ErrorSection } from '@/components/ErrorSection';
import { formatDate } from '@/utils/formatDate';

export function Profile() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [punishmentSettings, setPunishmentSettings] = useState<{ consent_given: boolean; intensity_level: string; safe_mode: boolean } | null>(null);
  const [punishmentHistory, setPunishmentHistory] = useState<Array<{ xp_deducted: number; punishment_type: string; applied_at: string; notes: string }>>([]);

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
      try {
        const punishRes = await apiClient.getPunishmentSettings(user.id);
        if (punishRes.success && punishRes.data) { setPunishmentSettings(punishRes.data); }
        if (punishRes.success && punishRes.data?.consent_given) {
          try {
            const historyRes = await apiClient.getPunishmentHistory(user.id);
            if (historyRes.success && historyRes.data?.punishments) {
              setPunishmentHistory(historyRes.data.punishments);
            }
          } catch { /* History API not available yet */ }
        }
      } catch { /* Punishment API not available yet — silently skip */ }
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
    return <ErrorSection message="Could not load your profile" onRetry={loadProfileData} />;
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      <ProfileHeader
        stats={stats}
        achievementCount={achievements.length}
        onEdit={() => setEditModalOpen(true)}
        onSettingsClick={() => navigate('/settings')}
        haptic={haptic}
      />

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

      <ProfileModes modes={stats.modes} perModeStreaks={stats.perModeStreaks} haptic={haptic} />

      <ProfileAchievements
        achievements={achievements}
        allAchievements={allAchievements}
        haptic={haptic}
        onViewAll={() => navigate('/achievements')}
      />

      <ProfileAccountability
        punishmentSettings={punishmentSettings}
        punishmentHistory={punishmentHistory}
        haptic={haptic}
        onNavigateSettings={() => navigate('/settings')}
      />

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
        onSaved={() => {
          loadProfileData();
          setToast({ message: 'Profile saved successfully!', variant: 'success' });
        }}
        telegramId={user!.id}
        currentName={stats.user.first_name}
        currentAvatarId={stats.user.avatar_id ?? 1}
        haptic={{ impact: haptic.impact, notification: haptic.notification, selection: haptic.selection }}
      />

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
