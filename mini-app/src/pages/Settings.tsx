import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@/hooks/useTelegram';
import { useBackButton } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useSettingsData } from '@/hooks/useSettingsData';
import { Loader2 } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { ErrorSection } from '@/components/ErrorSection';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { AccountabilitySettings } from '@/components/settings/AccountabilitySettings';
import { DangerZone } from '@/components/settings/DangerZone';

export function Settings() {
  const { user, haptic, showConfirm } = useTelegram();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onboardingStore = useOnboarding();

  const handleBack = useCallback(() => navigate('/profile'), [navigate]);
  useBackButton(handleBack);

  const {
    loading, error, saving, deleting,
    prefs, setPrefs, punishment, punishmentAvailable,
    accountabilitySaveStatus, toast, setToast,
    loadPreferences, handleConsentToggle, handleIntensityChange,
    handleSafeModeToggle, handleSave, handleDeleteAccount,
  } = useSettingsData({ user, haptic, showConfirm, navigate, queryClient, onboardingStore });

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-b-3xl">
          <div className="skeleton h-7 w-24 rounded-lg mb-2" />
          <div className="skeleton h-4 w-48 rounded-lg" />
        </div>
        <div className="px-4 mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="skeleton h-5 w-32 rounded-lg mb-3" />
              <div className="skeleton h-10 w-full rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorSection message="Could not load your settings" onRetry={loadPreferences} />;
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-b-3xl shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-200 text-sm mt-1">Configure your preferences</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        <NotificationSettings prefs={prefs} onPrefsChange={setPrefs} haptic={haptic} />
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
          className="w-full py-3.5 rounded-2xl bg-telegram-link text-white font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Saving...</>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>

      <DangerZone deleting={deleting} onDelete={handleDeleteAccount} />

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
