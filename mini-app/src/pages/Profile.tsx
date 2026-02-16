import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Palette, Trophy } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { useProfileData } from '@/hooks/useProfileData';
import { apiClient } from '@/api/client';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { AvatarRenderer, type EquippedItems } from '@/components/avatar';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { Toast } from '@/components/Toast';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { ProfileModes } from '@/components/profile/ProfileModes';
import { ProfileAchievements } from '@/components/profile/ProfileAchievements';
import { ProfileAccountability } from '@/components/profile/ProfileAccountability';
import { ProfileStreak } from '@/components/profile/ProfileStreak';
import { ProfileSkeleton } from '@/components/profile/ProfileSkeleton';
import { ErrorSection } from '@/components/ErrorSection';
import { formatDate } from '@/utils/formatDate';

export function Profile() {
  const { t } = useTranslation();
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

  const handleRefresh = useCallback(async () => { await loadProfileData(); }, [loadProfileData]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (error || !stats) {
    return <ErrorSection message={t('profile.couldNotLoad')} onRetry={loadProfileData} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <ProfileHeader
        stats={stats}
        achievementCount={achievements.length}
        onEdit={() => setEditModalOpen(true)}
        onSettingsClick={() => navigate('/settings')}
        haptic={haptic}
      />

      {/* Avatar Customization Section */}
      <div className="px-4 mt-4">
        <button
          onClick={() => { haptic.impact('light'); navigate('/avatar'); }}
          className="w-full flex items-center gap-3 bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 active:scale-[0.98] transition-transform"
        >
          {(stats.user as any).equipped_items ? (
            <AvatarRenderer equipped={(stats.user as any).equipped_items as EquippedItems} size="lg" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Palette className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 text-left">
            <span className="font-semibold text-sm">{t('profile.customizeAvatar')}</span>
            <p className="text-xs text-telegram-hint">{t('profile.customizeAvatarDesc')}</p>
          </div>
          <span className="text-telegram-hint text-lg">&rsaquo;</span>
        </button>
      </div>

      {/* Trophy Case Section */}
      <div className="px-4 mt-3">
        <button
          onClick={() => { haptic.impact('light'); navigate('/trophies'); }}
          className="w-full flex items-center gap-3 bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 active:scale-[0.98] transition-transform"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-left">
            <span className="font-semibold text-sm">{t('trophy.viewTrophyCase')}</span>
            <p className="text-xs text-telegram-hint">{t('trophy.viewTrophyCaseDesc')}</p>
          </div>
          <span className="text-telegram-hint text-lg">&rsaquo;</span>
        </button>
      </div>

      <ProfileStreak currentStreak={stats.user.current_streak} longestStreak={stats.user.longest_streak} />

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
          <h3 className="font-semibold mb-3 text-sm text-telegram-hint">{t('profile.accountInfo')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-telegram-hint">{t('profile.telegramId')}</span>
              <span className="font-mono">{stats.user.telegram_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">{t('profile.joined')}</span>
              <span>{formatDate(stats.user.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">{t('profile.totalXp')}</span>
              <span className="font-semibold">{stats.user.xp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-telegram-hint">{t('profile.level')}</span>
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
          apiClient.clearCache();
          setToast({ message: t('profile.savedSuccessfully'), variant: 'success' });
        }}
        telegramId={user!.id}
        currentName={stats.user.first_name}
        currentAvatarId={stats.user.avatar_id ?? 1}
        equippedItems={(stats.user as any).equipped_items}
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
