import { Bell, Clock, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import type { HapticWithSelection } from '@/types/telegram';

export interface NotificationModes {
  fitness: boolean;
  hydration: boolean;
  finance: boolean;
  learning: boolean;
  medication: boolean;
  habits: boolean;
}

export const DEFAULT_NOTIFICATION_MODES: NotificationModes = {
  fitness: true,
  hydration: true,
  finance: true,
  learning: true,
  medication: true,
  habits: true,
};

export interface UserPreferences {
  notifications_enabled: boolean;
  reminder_time: number;
  timezone: string;
  dnd_enabled: boolean;
  dnd_start: number;
  dnd_end: number;
  notification_modes: NotificationModes;
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

const MODE_KEYS: Array<{ key: keyof NotificationModes; icon: string; color: string }> = [
  { key: 'fitness', icon: '💪', color: 'bg-red-500' },
  { key: 'hydration', icon: '💧', color: 'bg-cyan-500' },
  { key: 'finance', icon: '💰', color: 'bg-emerald-500' },
  { key: 'learning', icon: '📚', color: 'bg-purple-500' },
  { key: 'medication', icon: '💊', color: 'bg-pink-500' },
  { key: 'habits', icon: '✅', color: 'bg-amber-500' },
];

export function formatUTCHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM';
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h}${suffix}`;
}

export function getLocalHour(utcHour: number): string {
  const now = new Date();
  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHour, 0));
  return utcDate.toLocaleTimeString(undefined, { hour: 'numeric', hour12: true });
}

export function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}

interface NotificationSettingsProps {
  prefs: UserPreferences;
  onPrefsChange: (prefs: UserPreferences) => void;
  haptic: HapticWithSelection;
}

export function NotificationSettings({ prefs, onPrefsChange, haptic }: NotificationSettingsProps) {
  const { t } = useTranslation();
  return (
    <>
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
              <h3 className="font-semibold text-sm">{t('settings.notifications')}</h3>
              <p className="text-xs text-telegram-hint">{t('settings.notificationDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => {
              haptic.selection();
              onPrefsChange({ ...prefs, notifications_enabled: !prefs.notifications_enabled });
            }}
            role="switch"
            aria-checked={prefs.notifications_enabled}
            aria-label={`Notifications: ${prefs.notifications_enabled ? 'on' : 'off'}`}
            className={`w-12 h-7 rounded-full transition-colors relative ${prefs.notifications_enabled ? 'bg-telegram-link' : 'bg-telegram-hint/30'}`}
          >
            <motion.div
              className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
              animate={{ left: prefs.notifications_enabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>

        {/* Per-mode notification toggles — only when notifications enabled */}
        {prefs.notifications_enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 space-y-2"
          >
            <p className="text-xs text-telegram-hint mb-2">{t('settings.notifModes.title')}</p>
            {MODE_KEYS.map(({ key, icon }) => (
              <div key={key} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{icon}</span>
                  <span className="text-sm text-telegram-text">{t(`settings.notifModes.${key}`)}</span>
                </div>
                <button
                  onClick={() => {
                    haptic.selection();
                    onPrefsChange({
                      ...prefs,
                      notification_modes: {
                        ...prefs.notification_modes,
                        [key]: !prefs.notification_modes[key],
                      },
                    });
                  }}
                  role="switch"
                  aria-checked={prefs.notification_modes[key]}
                  aria-label={`${t(`settings.notifModes.${key}`)}: ${prefs.notification_modes[key] ? 'on' : 'off'}`}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    prefs.notification_modes[key] ? 'bg-telegram-link' : 'bg-telegram-hint/30'
                  }`}
                >
                  <motion.div
                    className="w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm"
                    animate={{ left: prefs.notification_modes[key] ? 22 : 3 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            ))}
          </motion.div>
        )}
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
            <h3 className="font-semibold text-sm">{t('settings.reminderTime')}</h3>
            <p className="text-xs text-telegram-hint">{t('settings.reminderTimeDesc')}</p>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {ALL_HOURS.map((hour) => (
            <button
              key={hour}
              onClick={() => {
                haptic.selection();
                onPrefsChange({ ...prefs, reminder_time: hour });
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
            <h3 className="font-semibold text-sm">{t('settings.timezone')}</h3>
            <p className="text-xs text-telegram-hint">{t('settings.timezoneDesc')}</p>
          </div>
        </div>
        <input
          type="text"
          value={prefs.timezone}
          onChange={(e) => onPrefsChange({ ...prefs, timezone: e.target.value })}
          className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-4 py-2.5 text-sm text-telegram-text focus:outline-none focus:border-telegram-link transition-colors"
          placeholder={t('settings.timezonePlaceholder')}
          aria-label="Timezone"
        />
        <button
          onClick={() => {
            haptic.impact('light');
            onPrefsChange({ ...prefs, timezone: detectTimezone() });
          }}
          className="text-xs text-telegram-link mt-2 active:opacity-70"
        >
          {t('settings.autoDetectTimezone')}
        </button>
      </motion.div>
    </>
  );
}
