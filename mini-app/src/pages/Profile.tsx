import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useProfileData } from '@/hooks/useProfileData';
import { Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Toast } from '@/components/Toast';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileModes } from '@/components/profile/ProfileModes';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfileAccountability } from '@/components/profile/ProfileAccountability';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { ErrorSection } from '@/components/ErrorSection';
import { formatDate } from '@/utils/formatDate';

export function Profile() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const {
    stats, achievements, allAchievements,
    loading, error,
    punishmentSettings, punishmentHistory,
    loadProfileData,
    editModalOpen, setEditModalOpen,
    toast, setToast,
  } = useProfileData(user?.id);

  if (loading) {
    return <ProfileSkeleton />;
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
