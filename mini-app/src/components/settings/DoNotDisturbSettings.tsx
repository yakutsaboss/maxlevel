import { useState, useEffect, useRef } from 'react';
import { MoonStar, Check, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { apiClient } from '@/api/client';
import type { HapticWithSelection } from '@/types/telegram';

export interface DndPreferences {
  dnd_enabled: boolean;
  dnd_start: number; // 0-23
  dnd_end: number;   // 0-23
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(hour: number): string {
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h} ${suffix}`;
}

interface DoNotDisturbSettingsProps {
  dnd: DndPreferences;
  onDndChange: (dnd: DndPreferences) => void;
  haptic: HapticWithSelection;
  telegramId?: number;
}

export function DoNotDisturbSettings({ dnd, onDndChange, haptic, telegramId }: DoNotDisturbSettingsProps) {
  const { t } = useTranslation();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-save DND preferences with debounce
  const autoSave = (updated: DndPreferences) => {
    if (!telegramId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await apiClient.updateUserPreferences(telegramId, {
          dnd_enabled: updated.dnd_enabled,
          dnd_start: updated.dnd_start,
          dnd_end: updated.dnd_end,
        });
        setSaveStatus('saved');
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      } catch {
        setSaveStatus('error');
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
    };
  }, []);

  const handleChange = (updated: DndPreferences) => {
    onDndChange(updated);
    autoSave(updated);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <MoonStar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{t('settings.dnd.title')}</h3>
            <p className="text-xs text-telegram-hint">{t('settings.dnd.description')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-telegram-hint" />}
          {saveStatus === 'saved' && <Check className="w-3.5 h-3.5 text-green-500" />}
          {saveStatus === 'error' && <span className="text-[10px] text-red-400">!</span>}
          <button
            onClick={() => {
              haptic.selection();
              handleChange({ ...dnd, dnd_enabled: !dnd.dnd_enabled });
            }}
            role="switch"
            aria-checked={dnd.dnd_enabled}
            aria-label={`${t('settings.dnd.title')}: ${dnd.dnd_enabled ? 'on' : 'off'}`}
            className={`w-12 h-7 rounded-full transition-colors relative ${dnd.dnd_enabled ? 'bg-telegram-link' : 'bg-telegram-hint/30'}`}
          >
            <motion.div
              className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
              animate={{ left: dnd.dnd_enabled ? 26 : 4 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </div>

      {/* Time range picker — only shown when enabled */}
      {dnd.dnd_enabled && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 space-y-3"
        >
          {/* Start time */}
          <div>
            <p className="text-xs text-telegram-hint mb-2">
              {t('settings.dnd.from')} <span className="text-telegram-text font-medium">{formatHour(dnd.dnd_start)}</span>
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  onClick={() => {
                    haptic.selection();
                    handleChange({ ...dnd, dnd_start: hour });
                  }}
                  className={`flex-shrink-0 py-1.5 px-3 rounded-xl text-center transition-all active:scale-95 ${
                    dnd.dnd_start === hour
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
                  }`}
                >
                  <div className="text-xs font-semibold whitespace-nowrap">{formatHour(hour)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* End time */}
          <div>
            <p className="text-xs text-telegram-hint mb-2">
              {t('settings.dnd.until')} <span className="text-telegram-text font-medium">{formatHour(dnd.dnd_end)}</span>
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {HOURS.map((hour) => (
                <button
                  key={hour}
                  onClick={() => {
                    haptic.selection();
                    handleChange({ ...dnd, dnd_end: hour });
                  }}
                  className={`flex-shrink-0 py-1.5 px-3 rounded-xl text-center transition-all active:scale-95 ${
                    dnd.dnd_end === hour
                      ? 'bg-indigo-500 text-white shadow-md'
                      : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
                  }`}
                >
                  <div className="text-xs font-semibold whitespace-nowrap">{formatHour(hour)}</div>
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-telegram-hint/70 text-center">
            {t('settings.dnd.silencedRange', { start: formatHour(dnd.dnd_start), end: formatHour(dnd.dnd_end) })}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
