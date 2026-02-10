import { Shield, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface PunishmentSettings {
  consent_given: boolean;
  intensity_level: string;
  safe_mode: boolean;
}

export const INTENSITY_LEVELS = [
  { value: 'light', label: 'Light', description: '0.5x XP penalty' },
  { value: 'medium', label: 'Medium', description: '1x XP penalty' },
  { value: 'hard', label: 'Hard', description: '1.5x XP penalty' },
  { value: 'extreme', label: 'Extreme', description: '2x XP penalty' },
];

interface AccountabilitySettingsProps {
  punishment: PunishmentSettings;
  punishmentAvailable: boolean;
  onConsentToggle: () => void;
  onIntensityChange: (value: string) => void;
  onSafeModeToggle: () => void;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
}

export function AccountabilitySettings({
  punishment,
  punishmentAvailable,
  onConsentToggle,
  onIntensityChange,
  onSafeModeToggle,
  saveStatus,
}: AccountabilitySettingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${punishment.consent_given ? 'bg-red-500' : 'bg-gray-500'}`}>
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Accountability</h3>
            <p className="text-xs text-telegram-hint">Penalties for failed quests</p>
          </div>
        </div>
        <button
          onClick={onConsentToggle}
          className={`w-12 h-7 rounded-full transition-colors relative ${
            !punishmentAvailable ? 'bg-telegram-hint/20 opacity-50' :
            punishment.consent_given ? 'bg-red-500' : 'bg-telegram-hint/30'
          }`}
        >
          <motion.div
            className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
            animate={{ left: punishment.consent_given ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {!punishmentAvailable && (
        <p className="text-xs text-telegram-hint">Coming soon — complete onboarding to enable</p>
      )}

      {punishmentAvailable && punishment.consent_given && (
        <div className="space-y-3 mt-2">
          {/* Intensity Level */}
          <div>
            <label className="text-xs font-medium text-telegram-hint mb-1.5 block">Intensity Level</label>
            <div className="grid grid-cols-4 gap-1.5">
              {INTENSITY_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => onIntensityChange(level.value)}
                  className={`py-2 px-1 rounded-xl text-center transition-all active:scale-95 ${
                    punishment.intensity_level === level.value
                      ? 'bg-red-500 text-white shadow-md'
                      : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
                  }`}
                >
                  <div className="text-xs font-semibold">{level.label}</div>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-telegram-hint mt-1">
              {INTENSITY_LEVELS.find(l => l.value === punishment.intensity_level)?.description}
            </p>
          </div>

          {/* Safe Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Safe Mode</span>
              <p className="text-xs text-telegram-hint">Cap daily XP loss</p>
            </div>
            <button
              onClick={onSafeModeToggle}
              className={`w-12 h-7 rounded-full transition-colors relative ${punishment.safe_mode ? 'bg-telegram-link' : 'bg-telegram-hint/30'}`}
            >
              <motion.div
                className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
                animate={{ left: punishment.safe_mode ? 26 : 4 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mt-2 flex items-center gap-1.5"
          >
            {saveStatus === 'saving' && (
              <span className="text-xs text-telegram-hint flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs text-red-500">Failed to save</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
