import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTelegram } from '@/hooks/useTelegram';
import { useBackButton } from '@/hooks/useTelegram';
import { useOnboarding } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { NotificationSettings, detectTimezone } from '@/components/settings/NotificationSettings';
import { AccountabilitySettings } from '@/components/settings/AccountabilitySettings';
import { DangerZone } from '@/components/settings/DangerZone';
import type { UserPreferences } from '@/components/settings/NotificationSettings';
import type { PunishmentSettings } from '@/components/settings/AccountabilitySettings';

export function Settings() {
  const { user, haptic, showConfirm } = useTelegram();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const onboardingStore = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({
    notifications_enabled: true,
    reminder_time: 18,
    timezone: detectTimezone(),
  });
  const [punishment, setPunishment] = useState<PunishmentSettings>({
    consent_given: false,
    intensity_level: 'medium',
    safe_mode: true,
  });
  const [punishmentAvailable, setPunishmentAvailable] = useState(true);
  const [accountabilitySaveStatus, setAccountabilitySaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleting, setDeleting] = useState(false);
  const intensityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBack = useCallback(() => navigate('/profile'), [navigate]);
  useBackButton(handleBack);

  useEffect(() => { loadPreferences(); }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [res, punishRes] = await Promise.all([
        apiClient.getUserPreferences(user.id),
        apiClient.getPunishmentSettings(user.id).catch(() => null),
      ]);
      if (res.success && res.data) {
        setPrefs({
          notifications_enabled: res.data.notification_enabled ?? true,
          reminder_time: res.data.reminder_time ?? 18,
          timezone: res.data.timezone || detectTimezone(),
        });
      }
      if (punishRes && punishRes.success && punishRes.data) {
        setPunishment({
          consent_given: punishRes.data.consent_given ?? false,
          intensity_level: punishRes.data.intensity_level || 'medium',
          safe_mode: punishRes.data.safe_mode ?? true,
        });
      } else {
        setPunishmentAvailable(false);
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError(true);
    } finally { setLoading(false); }
  };

  const autoSaveAccountability = useCallback(async (settings: PunishmentSettings) => {
    if (!user?.id || !punishmentAvailable) return;
    setAccountabilitySaveStatus('saving');
    try {
      await apiClient.updatePunishmentSettings(user.id, {
        consent_given: settings.consent_given,
        intensity_level: settings.intensity_level,
        safe_mode: settings.safe_mode,
      });
      haptic.notification('success');
      setAccountabilitySaveStatus('saved');
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => setAccountabilitySaveStatus('idle'), 2000);
    } catch {
      setAccountabilitySaveStatus('error');
      if (saveStatusTimeoutRef.current) clearTimeout(saveStatusTimeoutRef.current);
      saveStatusTimeoutRef.current = setTimeout(() => setAccountabilitySaveStatus('idle'), 2000);
    }
  }, [user?.id, punishmentAvailable, haptic]);

  const handleConsentToggle = useCallback(() => {
    haptic.selection();
    if (!punishmentAvailable) return;
    setPunishment(prev => {
      const updated = { ...prev, consent_given: !prev.consent_given };
      autoSaveAccountability(updated);
      return updated;
    });
  }, [haptic, punishmentAvailable, autoSaveAccountability]);

  const handleIntensityChange = useCallback((value: string) => {
    haptic.selection();
    setPunishment(prev => {
      const updated = { ...prev, intensity_level: value };
      if (intensityDebounceRef.current) clearTimeout(intensityDebounceRef.current);
      intensityDebounceRef.current = setTimeout(() => autoSaveAccountability(updated), 500);
      return updated;
    });
  }, [haptic, autoSaveAccountability]);

  const handleSafeModeToggle = useCallback(() => {
    haptic.selection();
    setPunishment(prev => {
      const updated = { ...prev, safe_mode: !prev.safe_mode };
      autoSaveAccountability(updated);
      return updated;
    });
  }, [haptic, autoSaveAccountability]);

  const handleSave = async () => {
    if (!user?.id || saving) return;
    haptic.impact('medium');
    setSaving(true);
    try {
      await apiClient.updateUserPreferences(user.id, {
        notification_enabled: prefs.notifications_enabled,
        reminder_time: prefs.reminder_time,
        timezone: prefs.timezone,
      });
      haptic.notification('success');
      setToast({ message: 'Settings saved!', variant: 'success' });
    } catch {
      haptic.notification('warning');
      setToast({ message: 'Failed to save settings', variant: 'error' });
    } finally { setSaving(false); }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id || deleting) return;
    const confirmed = await showConfirm(
      'Are you sure? This will permanently delete your account, progress, and all data. This cannot be undone.'
    );
    if (!confirmed) return;
    haptic.impact('heavy');
    setDeleting(true);
    try {
      const res = await apiClient.deleteAccount(user.id);
      if (res.success) {
        queryClient.clear();
        onboardingStore.reset();
        setToast({ message: 'Account deleted. Starting fresh...', variant: 'success' });
        setTimeout(() => navigate('/onboarding', { replace: true }), 1200);
      } else {
        setToast({ message: 'Failed to delete account', variant: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to delete account', variant: 'error' });
    } finally { setDeleting(false); }
  };

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">Something went wrong</h3>
          <p className="text-sm text-red-500 mb-4">Could not load your settings</p>
          <button onClick={() => { haptic.impact('light'); loadPreferences(); }} className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform">
            <RefreshCw className="w-4 h-4" />Retry
          </button>
        </div>
      </div>
    );
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
