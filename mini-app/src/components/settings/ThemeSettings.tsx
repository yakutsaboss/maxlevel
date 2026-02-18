import { useState } from 'react';
import { Sun, Moon, Monitor, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import type { ThemeParams } from '@twa-dev/types';

const THEME_PREF_KEY = 'theme_preference';

export type ThemePreference = 'auto' | 'light' | 'dark';

export function getThemePreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_PREF_KEY);
    if (v === 'light' || v === 'dark') return v;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    localStorage.setItem(THEME_PREF_KEY, pref);
  } catch { /* noop */ }
}

function detectCurrentTheme(colorScheme: string | undefined): 'light' | 'dark' {
  if (colorScheme === 'dark') return 'dark';
  return 'light';
}

interface ThemeSettingsProps {
  colorScheme: string | undefined;
  themeParams: ThemeParams | undefined;
  haptic?: { selection: () => void };
}

const options: { value: ThemePreference; label: string; icon: typeof Sun; desc: string }[] = [
  { value: 'auto', label: 'Auto', icon: Monitor, desc: 'Follow Telegram' },
  { value: 'light', label: 'Light', icon: Sun, desc: 'Always light' },
  { value: 'dark', label: 'Dark', icon: Moon, desc: 'Always dark' },
];

export function ThemeSettings({ colorScheme, themeParams, haptic }: ThemeSettingsProps) {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);
  const detectedTheme = detectCurrentTheme(colorScheme);

  const activeTheme = preference === 'auto' ? detectedTheme : preference;

  const handleSelect = (pref: ThemePreference) => {
    haptic?.selection();
    setThemePreference(pref);
    setPreference(pref);
  };

  // Extract a few themeParams colors for the preview
  const bgColor = themeParams?.bg_color;
  const textColor = themeParams?.text_color;
  const hintColor = themeParams?.hint_color;
  const linkColor = themeParams?.link_color;
  const buttonColor = themeParams?.button_color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.16 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
          <Palette className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Theme</h3>
          <p className="text-xs text-telegram-hint">
            Current: {activeTheme === 'dark' ? 'Dark' : 'Light'} mode
            {preference === 'auto' && ' (auto)'}
          </p>
        </div>
      </div>

      {/* Theme preference selector */}
      <div className="flex gap-2">
        {options.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => handleSelect(value)}
            aria-label={`${label} theme: ${desc}`}
            className={`flex-1 py-2.5 px-2 rounded-xl text-center transition-all active:scale-95 ${
              preference === value
                ? 'bg-telegram-link text-white shadow-md'
                : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
            }`}
          >
            <Icon className={`w-4 h-4 mx-auto mb-1 ${preference === value ? 'text-white' : ''}`} aria-hidden="true" />
            <div className="text-xs font-semibold">{label}</div>
            <div className={`text-[10px] mt-0.5 ${preference === value ? 'text-white/70' : 'text-telegram-hint/70'}`}>
              {desc}
            </div>
          </button>
        ))}
      </div>

      {/* Theme colors preview */}
      {(bgColor || textColor || linkColor) && (
        <div className="mt-3 pt-3 border-t border-telegram-hint/10">
          <p className="text-[10px] text-telegram-hint mb-2 uppercase tracking-wide">Telegram Theme Colors</p>
          <div className="flex gap-1.5 flex-wrap">
            {[
              { color: bgColor, label: 'BG' },
              { color: textColor, label: 'Text' },
              { color: hintColor, label: 'Hint' },
              { color: linkColor, label: 'Link' },
              { color: buttonColor, label: 'Button' },
            ]
              .filter((c) => c.color)
              .map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <div
                    className="w-4 h-4 rounded-full border border-telegram-hint/20"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] text-telegram-hint">{label}</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
