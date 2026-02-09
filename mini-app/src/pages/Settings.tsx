import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram } from '@/hooks/useTelegram';
import { useBackButton } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { Bell, Clock, Globe, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toast } from '@/components/Toast';

interface UserPreferences {
  notifications_enabled: boolean;
  reminder_time: number;
  timezone: string;
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatUTCHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}${suffix}`;
}

function getLocalHour(utcHour: number): string {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHour, 0));
  return utcDate.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
}

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

export function Settings() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences>({
    notifications_enabled: true,
    reminder_time: 18,
    timezone: detectTimezone(),
  });

  const handleBack = useCallback(() => navigate('/profile'), [navigate]);
  useBackButton(handleBack);

  useEffect(() => { loadPreferences(); }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const res = await apiClient.getUserPreferences(user.id);
      if (res.success && res.data) {
        setPrefs({
          notifications_enabled: res.data.notification_enabled ?? true,
          reminder_time: res.data.reminder_time ?? 18,
          timezone: res.data.timezone || detectTimezone(),
        });
      }
    } catch (err) {
      console.error('Failed to load preferences:', err);
      setError(true);
    } finally { setLoading(false); }
  };

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
      <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-6 rounded-b-3xl shadow-lg">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-200 text-sm mt-1">Configure your preferences</p>
      </div>

      <div className="px-4 mt-6 space-y-4">
        {/* Notifications Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Notifications</h3>
                <p className="text-xs text-telegram-hint">Daily reminders & updates</p>
              </div>
            </div>
            <button
              onClick={() => {
                haptic.selection();
                setPrefs(p => ({ ...p, notifications_enabled: !p.notifications_enabled }));
              }}
              className={`w-12 h-7 rounded-full transition-colors relative ${prefs.notifications_enabled ? 'bg-telegram-link' : 'bg-telegram-hint/30'}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                animate={{ left: prefs.notifications_enabled ? 26 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </motion.div>

        {/* Reminder Time */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-orange-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Reminder Time</h3>
              <p className="text-xs text-telegram-hint">When to send daily reminder</p>
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {ALL_HOURS.map((hour) => (
              <button
                key={hour}
                onClick={() => {
                  haptic.selection();
                  setPrefs(p => ({ ...p, reminder_time: hour }));
                }}
                className={`flex-shrink-0 py-2 px-3 rounded-xl text-center transition-all active:scale-95 ${
                  prefs.reminder_time === hour
                    ? 'bg-telegram-link text-white shadow-md'
                    : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
                }`}
              >
                <div className="text-xs font-semibold">{formatUTCHour(hour)}</div>
                <div className={`text-[10px] mt-0.5 ${prefs.reminder_time === hour ? 'text-white/70' : 'text-telegram-hint/70'}`}>
                  {getLocalHour(hour)}
                </div>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Timezone */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-green-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Timezone</h3>
              <p className="text-xs text-telegram-hint">Auto-detected from browser</p>
            </div>
          </div>
          <input
            type="text"
            value={prefs.timezone}
            onChange={(e) => setPrefs(p => ({ ...p, timezone: e.target.value }))}
            className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-4 py-2.5 text-sm text-telegram-text focus:outline-none focus:border-telegram-link transition-colors"
            placeholder="e.g. Europe/Moscow"
          />
          <button
            onClick={() => {
              haptic.impact('light');
              setPrefs(p => ({ ...p, timezone: detectTimezone() }));
            }}
            className="text-xs text-telegram-link mt-2 active:opacity-70"
          >
            Auto-detect timezone
          </button>
        </motion.div>
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
