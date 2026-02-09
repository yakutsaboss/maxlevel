import { useState } from 'react';
import { motion } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import type { OnboardingData } from '@/hooks/useOnboarding';

const INTENSITIES = [
  { value: 'low', label: 'Gentle', color: 'bg-green-500/15 border-green-500 text-green-400' },
  { value: 'medium', label: 'Moderate', color: 'bg-yellow-500/15 border-yellow-500 text-yellow-400' },
  { value: 'high', label: 'Strict', color: 'bg-orange-500/15 border-orange-500 text-orange-400' },
  { value: 'extreme', label: 'No Mercy', color: 'bg-red-500/15 border-red-500 text-red-400' },
];

interface PunishmentConfigProps {
  progress: number;
  data: OnboardingData;
  onUpdate: (punishments: OnboardingData['punishments']) => void;
  onNext: () => void;
}

export function PunishmentConfig({ progress, data, onUpdate, onNext }: PunishmentConfigProps) {
  const { haptic } = useTelegram();
  const existing = data.punishments || {};

  const [consent, setConsent] = useState(existing.consent_given || false);
  const [intensity, setIntensity] = useState(existing.intensity_level || 'low');
  const [safeMode, setSafeMode] = useState(existing.safe_mode !== false);
  const [customText, setCustomText] = useState('');

  const update = (changes: Partial<NonNullable<OnboardingData['punishments']>>) => {
    const merged = {
      consent_given: consent,
      intensity_level: intensity,
      safe_mode: safeMode,
      ...changes,
    };
    onUpdate(merged);
  };

  const toggleConsent = () => {
    haptic.selection();
    const next = !consent;
    setConsent(next);
    update({ consent_given: next });
  };

  const selectIntensity = (v: string) => {
    haptic.selection();
    setIntensity(v);
    update({ intensity_level: v });
  };

  const toggleSafe = () => {
    haptic.selection();
    const next = !safeMode;
    setSafeMode(next);
    update({ safe_mode: next });
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} />

      {/* Red gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none" style={{ height: '30%' }} />

      <div className="flex-1 flex flex-col px-6 pt-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Skull className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-telegram-text mb-1">
            Accountability
          </h2>
          <p className="text-telegram-hint text-sm">
            Want extra motivation? Add consequences for skipping tasks.
          </p>
        </motion.div>

        {/* Consent toggle */}
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-telegram-text text-sm">Enable accountability</p>
              <p className="text-xs text-telegram-hint mt-0.5">Lose XP or streaks when you skip</p>
            </div>
            <button
              onClick={toggleConsent}
              className={`w-12 h-7 rounded-full transition-all ${
                consent ? 'bg-red-500' : 'bg-telegram-hint/30'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
                  consent ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {consent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="space-y-4"
          >
            {/* Intensity */}
            <div>
              <p className="text-sm font-medium text-telegram-text mb-2">How strict?</p>
              <div className="grid grid-cols-2 gap-2">
                {INTENSITIES.map((item) => (
                  <button
                    key={item.value}
                    onClick={() => selectIntensity(item.value)}
                    className={`
                      py-2.5 px-3 rounded-xl text-xs font-semibold border-2 transition-all
                      ${intensity === item.value ? item.color : 'border-transparent bg-telegram-secondaryBg text-telegram-hint'}
                    `}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom punishment */}
            <div>
              <p className="text-sm font-medium text-telegram-text mb-2">Custom penalty (optional)</p>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder='e.g. "50 pushups" or "No social media 1hr"'
                className="w-full py-3 px-4 rounded-xl bg-telegram-secondaryBg border-2 border-telegram-hint/20 text-telegram-text text-sm placeholder:text-telegram-hint/50 focus:border-red-400 focus:outline-none"
              />
            </div>

            {/* Safe mode */}
            <div className="bg-telegram-secondaryBg rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-telegram-text text-sm">Safe Mode</p>
                  <p className="text-xs text-telegram-hint mt-0.5">Limits daily losses so you can't lose everything</p>
                </div>
                <button
                  onClick={toggleSafe}
                  className={`w-12 h-7 rounded-full transition-all ${
                    safeMode ? 'bg-green-500' : 'bg-telegram-hint/30'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform mx-1 ${
                      safeMode ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="px-6 pb-8 relative z-10">
        <button
          onClick={() => { haptic.impact('medium'); onNext(); }}
          className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
        >
          {consent ? 'Enable & Continue' : 'Skip for Now'}
        </button>
      </div>
    </div>
  );
}
