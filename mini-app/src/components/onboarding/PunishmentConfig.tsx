import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import type { OnboardingData } from '@/hooks/useOnboarding';

type PunishmentType = 'workout' | 'book' | 'money';
type Difficulty = 'easy' | 'medium' | 'hard' | 'extreme';

const PUNISHMENT_TYPES: {
  value: PunishmentType;
  emoji: string;
  label: string;
  tagline: string;
  gradient: string;
  border: string;
  glow: string;
}[] = [
  {
    value: 'workout',
    emoji: '\uD83D\uDCAA',
    label: 'Workout',
    tagline: 'Missed a task? Drop and give me pushups!',
    gradient: 'from-amber-500/20 to-orange-500/10',
    border: 'border-amber-500',
    glow: 'shadow-amber-500/30',
  },
  {
    value: 'book',
    emoji: '\uD83D\uDCD6',
    label: 'Book',
    tagline: 'Skipped your goal? Time to read.',
    gradient: 'from-blue-500/20 to-indigo-500/10',
    border: 'border-blue-500',
    glow: 'shadow-blue-500/30',
  },
  {
    value: 'money',
    emoji: '\uD83D\uDCB8',
    label: 'Money',
    tagline: 'Failed today? Donate to a good cause.',
    gradient: 'from-emerald-500/20 to-green-500/10',
    border: 'border-emerald-500',
    glow: 'shadow-emerald-500/30',
  },
];

const DIFFICULTY_MAP: Record<PunishmentType, { value: Difficulty; label: string; dot: string }[]> = {
  workout: [
    { value: 'easy', label: '20 pushups', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: '50 pushups', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: '100 pushups', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: '200 pushups + 1 min plank', dot: '\uD83D\uDD34' },
  ],
  book: [
    { value: 'easy', label: 'Read 10 pages', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: 'Read 30 pages', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: 'Read 50 pages', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: 'Read 100 pages', dot: '\uD83D\uDD34' },
  ],
  money: [
    { value: 'easy', label: 'Donate $1', dot: '\uD83D\uDFE2' },
    { value: 'medium', label: 'Donate $5', dot: '\uD83D\uDFE1' },
    { value: 'hard', label: 'Donate $10', dot: '\uD83D\uDFE0' },
    { value: 'extreme', label: 'Donate $25', dot: '\uD83D\uDD34' },
  ],
};

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
  const [punishmentType, setPunishmentType] = useState<PunishmentType | null>(existing.punishment_type || null);
  const [difficulty, setDifficulty] = useState<Difficulty>(existing.difficulty || 'easy');
  const [safeMode, setSafeMode] = useState(existing.safe_mode !== false);
  const [step, setStep] = useState<'type' | 'difficulty'>(existing.punishment_type ? 'difficulty' : 'type');

  const save = (overrides: Partial<NonNullable<OnboardingData['punishments']>> = {}) => {
    onUpdate({
      consent_given: consent,
      punishment_type: punishmentType,
      difficulty,
      intensity_level: difficulty, // backward compat
      safe_mode: safeMode,
      ...overrides,
    });
  };

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

  const selectType = (type: PunishmentType) => {
    haptic.impact('medium');
    setPunishmentType(type);
  };

  const goToDifficulty = () => {
    haptic.impact('light');
    setStep('difficulty');
  };

  const selectDifficulty = (d: Difficulty) => {
    haptic.selection();
    setDifficulty(d);
  };

  const toggleSafe = () => {
    haptic.selection();
    setSafeMode((prev) => !prev);
  };

  const handleContinue = () => {
    haptic.impact('medium');
    save({
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
      <ProgressBar progress={progress} />

      {/* Red gradient overlay */}
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

        {/* Consent toggle */}
        <div className="bg-telegram-secondaryBg rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-telegram-text text-sm">Enable accountability</p>
              <p className="text-xs text-telegram-hint mt-0.5">Choose a real punishment you'll actually do</p>
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

        <AnimatePresence mode="wait">
          {consent && step === 'type' && (
            <motion.div
              key="type-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              <p className="text-sm font-medium text-telegram-text mb-1">
                Choose your punishment type
              </p>

              {PUNISHMENT_TYPES.map((pt) => {
                const selected = punishmentType === pt.value;
                return (
                  <motion.button
                    key={pt.value}
                    onClick={() => selectType(pt.value)}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      w-full text-left rounded-2xl p-5 border-2 transition-all
                      bg-gradient-to-r ${pt.gradient}
                      ${selected ? `${pt.border} shadow-lg ${pt.glow}` : 'border-transparent'}
                    `}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-4xl">{pt.emoji}</span>
                      <div className="flex-1">
                        <p className="text-telegram-text font-bold text-lg">{pt.label}</p>
                        <p className="text-telegram-hint text-sm mt-0.5">{pt.tagline}</p>
                      </div>
                      {selected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"
                        >
                          <span className="text-sm">&#10003;</span>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}

              {punishmentType && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={goToDifficulty}
                  className="w-full py-3.5 mt-2 rounded-2xl text-base font-bold bg-telegram-button text-telegram-buttonText"
                >
                  Next
                </motion.button>
              )}
            </motion.div>
          )}

          {consent && step === 'difficulty' && punishmentType && (
            <motion.div
              key="difficulty-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-3"
            >
              {/* Back to type selector */}
              <button
                onClick={() => { haptic.selection(); setStep('type'); }}
                className="text-sm text-telegram-link font-medium mb-1"
              >
                &larr; Change type
              </button>

              <p className="text-sm font-medium text-telegram-text">
                How tough? ({PUNISHMENT_TYPES.find((t) => t.value === punishmentType)?.emoji}{' '}
                {PUNISHMENT_TYPES.find((t) => t.value === punishmentType)?.label})
              </p>

              {DIFFICULTY_MAP[punishmentType].map((d) => {
                const selected = difficulty === d.value;
                return (
                  <motion.button
                    key={d.value}
                    onClick={() => selectDifficulty(d.value)}
                    whileTap={{ scale: 0.97 }}
                    className={`
                      w-full text-left rounded-xl px-4 py-3.5 border-2 transition-all
                      ${selected
                        ? 'border-telegram-button bg-telegram-button/10'
                        : 'border-transparent bg-telegram-secondaryBg'}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{d.dot}</span>
                      <span className="text-telegram-text font-semibold text-sm flex-1">
                        {d.label}
                      </span>
                      <span className="text-telegram-hint text-xs capitalize">{d.value}</span>
                    </div>
                  </motion.button>
                );
              })}

              {/* Safe mode toggle */}
              <div className="bg-telegram-secondaryBg rounded-2xl p-4 mt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-telegram-text text-sm">Safe Mode</p>
                    <p className="text-xs text-telegram-hint mt-0.5">
                      Limits daily losses so you can't lose everything
                    </p>
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
