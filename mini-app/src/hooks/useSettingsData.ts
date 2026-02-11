import { useEffect, useState, useCallback, useRef } from 'react';
import { apiClient } from '@/api/client';
import { detectTimezone } from '@/components/settings/NotificationSettings';
import type { UserPreferences } from '@/components/settings/NotificationSettings';
import type { PunishmentSettings } from '@/components/settings/AccountabilitySettings';
import { getErrorMessage } from '@/hooks/useApiError';
import type { HapticFull } from '@/types/telegram';

interface UseSettingsDataParams {
  user: { id: number } | undefined;
  haptic: HapticFull;
  showConfirm: (message: string) => Promise<boolean>;
  navigate: (path: string, options?: { replace?: boolean }) => void;
  queryClient: { clear: () => void };
  onboardingStore: { reset: () => void };
}

export function useSettingsData({
  user,
  haptic,
  showConfirm,
  navigate: _navigate,
  queryClient,
  onboardingStore,
}: UseSettingsDataParams) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({
    notifications_enabled: true,
    reminder_time: 18,
    timezone: detectTimezone(),
    dnd_enabled: false,
    dnd_start: 22,
    dnd_end: 8,
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
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadPreferences();
    return () => { abortRef.current?.abort(); };
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) { setLoading(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    try {
      setLoading(true);
      setError(false);
      setErrorMessage('');
      const [res, punishRes] = await Promise.all([
        apiClient.getUserPreferences(user.id, { signal }),
        apiClient.getPunishmentSettings(user.id, { signal }).catch(() => null),
      ]);
      if (res.success && res.data) {
        setPrefs({
          notifications_enabled: res.data.notification_enabled ?? true,
          reminder_time: res.data.reminder_time ?? 18,
          timezone: res.data.timezone || detectTimezone(),
          dnd_enabled: res.data.dnd_enabled ?? false,
          dnd_start: res.data.dnd_start ?? 22,
          dnd_end: res.data.dnd_end ?? 8,
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
      if (signal.aborted) return;
      console.error('Failed to load preferences:', err);
      setError(true);
      setErrorMessage(getErrorMessage(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
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
        dnd_enabled: prefs.dnd_enabled,
        dnd_start: prefs.dnd_start,
        dnd_end: prefs.dnd_end,
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
        // Hard reload to force full state reset — React Router navigate
        // doesn't re-run checkOnboardingState, so deleted users stay on
        // protected pages with stale needsOnboarding=false.
        // Use replace() to prevent back-button returning to deleted state.
        setTimeout(() => {
          window.location.replace(window.location.origin + '/levelapp/onboarding');
        }, 500);
      } else {
        setToast({ message: 'Failed to delete account', variant: 'error' });
      }
    } catch {
      setToast({ message: 'Failed to delete account', variant: 'error' });
    } finally { setDeleting(false); }
  };

  return {
    loading,
    error,
    errorMessage,
    saving,
    deleting,
    prefs,
    setPrefs,
    punishment,
    punishmentAvailable,
    accountabilitySaveStatus,
    toast,
    setToast,
    loadPreferences,
    handleConsentToggle,
    handleIntensityChange,
    handleSafeModeToggle,
    handleSave,
    handleDeleteAccount,
  };
}
