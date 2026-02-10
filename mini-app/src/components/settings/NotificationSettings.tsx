import { Bell, Clock, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export interface UserPreferences {
  notifications_enabled: boolean;
  reminder_time: number;
  timezone: string;
}

const ALL_HOURS = Array.from({ length: 24 }, (_, i) => i);

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
  haptic: { selection: () => void; impact: (...args: any[]) => void };
}

export function NotificationSettings({ prefs, onPrefsChange, haptic }: NotificationSettingsProps) {
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
              <h3 className="font-semibold text-sm">Notifications</h3>
              <p className="text-xs text-telegram-hint">Daily reminders & updates</p>
            </div>
          </div>
          <button
            onClick={() => {
              haptic.selection();
              onPrefsChange({ ...prefs, notifications_enabled: !prefs.notifications_enabled });
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
            <h3 className="font-semibold text-sm">Timezone</h3>
            <p className="text-xs text-telegram-hint">Auto-detected from browser</p>
          </div>
        </div>
        <input
          type="text"
          value={prefs.timezone}
          onChange={(e) => onPrefsChange({ ...prefs, timezone: e.target.value })}
          className="w-full bg-telegram-bg border border-telegram-hint/20 rounded-xl px-4 py-2.5 text-sm text-telegram-text focus:outline-none focus:border-telegram-link transition-colors"
          placeholder="e.g. Europe/Moscow"
        />
        <button
          onClick={() => {
            haptic.impact('light');
            onPrefsChange({ ...prefs, timezone: detectTimezone() });
          }}
          className="text-xs text-telegram-link mt-2 active:opacity-70"
        >
          Auto-detect timezone
        </button>
      </motion.div>
    </>
  );
}
