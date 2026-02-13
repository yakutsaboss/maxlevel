import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@/hooks/useTelegram';
import { useBackButton, isHapticEnabled } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSettingsData } from '@/hooks/useSettingsData';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { Loader2 } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { ErrorSection } from '@/components/ErrorSection';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { DoNotDisturbSettings } from '@/components/settings/DoNotDisturbSettings';
import { HapticFeedbackSettings } from '@/components/settings/HapticFeedbackSettings';
import { AccountabilitySettings } from '@/components/settings/AccountabilitySettings';
import { AboutSection } from '@/components/settings/AboutSection';
import { ThemeSettings } from '@/components/settings/ThemeSettings';
import { DangerZone } from '@/components/settings/DangerZone';
import { SettingsSkeleton } from '@/components/settings/SettingsSkeleton';

export function Settings() {
  const { t } = useTranslation();
  const { user, haptic, showConfirm, openTelegramLink, colorScheme, themeParams } = useTelegram();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onboardingStore = useOnboarding();
  const [hapticEnabled, setHapticEnabled] = useState(isHapticEnabled);

  const handleBack = useCallback(() => navigate('/profile'), [navigate]);
  useBackButton(handleBack);

  const {
    loading, error, saving, deleting,
    prefs, setPrefs, punishment, punishmentAvailable,
    accountabilitySaveStatus, toast, setToast,
    loadPreferences, handleConsentToggle, handleIntensityChange,
    handleSafeModeToggle, handleSave, handleDeleteAccount,
  } = useSettingsData({ user, haptic, showConfirm, navigate, queryClient, onboardingStore });

  const handleRefresh = useCallback(async () => { await loadPreferences(); }, [loadPreferences]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  if (loading) {
    return <SettingsSkeleton />;
  }

  if (error) {
    return <ErrorSection message={t('settings.couldNotLoad')} onRetry={loadPreferences} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-b-3xl shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <h1 className="text-2xl font-bold text-white">{t('settings.title')}</h1>
        <p className="text-gray-200 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <NotificationSettings prefs={prefs} onPrefsChange={setPrefs} haptic={haptic} />
        <DoNotDisturbSettings
          dnd={{ dnd_enabled: prefs.dnd_enabled, dnd_start: prefs.dnd_start, dnd_end: prefs.dnd_end }}
          onDndChange={(dnd) => setPrefs((p) => ({ ...p, ...dnd }))}
          haptic={haptic}
        />
        <HapticFeedbackSettings enabled={hapticEnabled} onChange={setHapticEnabled} />
        <ThemeSettings colorScheme={colorScheme} themeParams={themeParams} haptic={haptic} />
        <AccountabilitySettings
          punishment={punishment}
          punishmentAvailable={punishmentAvailable}
          onConsentToggle={handleConsentToggle}
          onIntensityChange={handleIntensityChange}
          onSafeModeToggle={handleSafeModeToggle}
          saveStatus={accountabilitySaveStatus}
        />
      </div>

      {/* Save Button */}
      <div className="px-4 mt-6">
        <button
          onClick={handleSave}
          disabled={saving}
          aria-label={saving ? t('settings.saving') : t('settings.saveSettings')}
          className="w-full py-3.5 rounded-2xl bg-telegram-link text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />{t('settings.saving')}</>
          ) : (
            t('settings.saveSettings')
          )}
        </button>
      </div>

      <DangerZone deleting={deleting} onDelete={handleDeleteAccount} />

      <AboutSection onOpenTelegramLink={openTelegramLink} />

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
