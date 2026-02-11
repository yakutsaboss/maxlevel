import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { ConsentToggle } from './punishment/ConsentToggle';
import { TypeSelector } from './punishment/TypeSelector';
import { DifficultySelector } from './punishment/DifficultySelector';
import type { PunishmentType, Difficulty } from './punishment/constants';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface PunishmentConfigProps {
  progress: number;
  stepLabel?: string;
  data: OnboardingData;
  onUpdate: (punishments: OnboardingData['punishments']) => void;
  onNext: () => void;
}

export function PunishmentConfig({ progress, stepLabel, data, onUpdate, onNext }: PunishmentConfigProps) {
  const { haptic } = useTelegram();
  const existing = data.punishments || {};

  const [consent, setConsent] = useState(existing.consent_given || false);
  const [punishmentType, setPunishmentType] = useState<PunishmentType | null>(existing.punishment_type || null);
  const [difficulty, setDifficulty] = useState<Difficulty>(existing.difficulty || 'easy');
  const [safeMode, setSafeMode] = useState(existing.safe_mode !== false);
  const [step, setStep] = useState<'type' | 'difficulty'>(existing.punishment_type ? 'difficulty' : 'type');

  const toggleConsent = () => {
    haptic.selection();
    const next = !consent;
    setConsent(next);
    if (!next) {
      setPunishmentType(null);
      setStep('type');
      onUpdate({ consent_given: false, safe_mode: safeMode });
    }
  };

  const handleContinue = () => {
    haptic.impact('medium');
    onUpdate({
      consent_given: consent,
      punishment_type: punishmentType,
      difficulty,
      intensity_level: difficulty,
      safe_mode: safeMode,
    });
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div
        className="absolute inset-0 bg-gradient-to-b from-red-900/20 to-transparent pointer-events-none"
        style={{ height: '30%' }}
      />

      <div className="flex-1 flex flex-col px-6 pt-6 relative z-10 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Skull className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h2 className="text-2xl font-bold text-telegram-text mb-1">Accountability</h2>
          <p className="text-telegram-hint text-sm">
            Want extra motivation? Pick a real consequence for skipping tasks.
          </p>
        </motion.div>

        <ConsentToggle consent={consent} onToggle={toggleConsent} />

        <AnimatePresence mode="wait">
          {consent && step === 'type' && (
            <TypeSelector
              punishmentType={punishmentType}
              onSelectType={(type) => { haptic.impact('medium'); setPunishmentType(type); }}
              onNext={() => { haptic.impact('light'); setStep('difficulty'); }}
            />
          )}

          {consent && step === 'difficulty' && punishmentType && (
            <DifficultySelector
              punishmentType={punishmentType}
              difficulty={difficulty}
              safeMode={safeMode}
              onSelectDifficulty={(d) => { haptic.selection(); setDifficulty(d); }}
              onToggleSafe={() => { haptic.selection(); setSafeMode((prev) => !prev); }}
              onBack={() => { haptic.selection(); setStep('type'); }}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8 relative z-10">
        {consent && step === 'difficulty' && punishmentType ? (
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
          >
            Enable & Continue
          </button>
        ) : !consent ? (
          <button
            onClick={() => {
              haptic.impact('medium');
              onUpdate({ consent_given: false, safe_mode: safeMode });
              onNext();
            }}
            className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg"
          >
            Skip for Now
          </button>
        ) : null}
      </div>
    </div>
  );
}
