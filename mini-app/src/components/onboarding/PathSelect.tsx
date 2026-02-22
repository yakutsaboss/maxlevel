import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ModeUnlockModal } from '@/components/ModeUnlockModal';
import { ProgressBar } from './ui/ProgressBar';
import { ContinueButton } from './ui/ContinueButton';

/** Free modes always available, paid modes require unlock */
const FREE_MODES = ['fitness', 'hydration', 'habits'];

const MODES = [
  {
    id: 'fitness',
    nameKey: 'onboarding.modeFitness',
    descKey: 'onboarding.modeFitnessDesc',
    icon: '🏋️',
    color: 'border-red-500 bg-red-500/10',
  },
  {
    id: 'hydration',
    nameKey: 'onboarding.modeHydration',
    descKey: 'onboarding.modeHydrationDesc',
    icon: '💧',
    color: 'border-blue-500 bg-blue-500/10',
  },
  {
    id: 'medication',
    nameKey: 'onboarding.modeMedication',
    descKey: 'onboarding.modeMedicationDesc',
    icon: '💊',
    color: 'border-green-500 bg-green-500/10',
  },
  {
    id: 'habits',
    nameKey: 'onboarding.modeHabits',
    descKey: 'onboarding.modeHabitsDesc',
    icon: '🎯',
    color: 'border-purple-500 bg-purple-500/10',
  },
];

interface PathSelectProps {
  progress: number;
  stepLabel?: string;
  value?: string[];
  onSelect: (modes: string[]) => void;
  onNext: () => void;
  /** List of unlocked paid mode names (from useModeUnlock). If undefined, medication defaults to locked. */
  unlockedModes?: string[];
  /** User's current XP (for showing in unlock modal) */
  userXP?: number;
  /** Whether an unlock operation is in progress */
  isUnlocking?: boolean;
  /** Error from the last unlock attempt */
  unlockError?: string | null;
  /** Callback when user taps "Unlock with Stars" */
  onUnlockWithStars?: (modeName: string) => void;
  /** Callback when user taps "Unlock with XP" */
  onUnlockWithXP?: (modeName: string) => void;
}

export function PathSelect({
  progress, stepLabel, value, onSelect, onNext,
  unlockedModes, userXP = 0, isUnlocking = false, unlockError = null,
  onUnlockWithStars, onUnlockWithXP,
}: PathSelectProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState<string[]>(value || []);
  const [shakingCard, setShakingCard] = useState<string | null>(null);
  const [lockToast, setLockToast] = useState(false);
  const [unlockModalMode, setUnlockModalMode] = useState<string | null>(null);

  /** Check if a mode is available (free or unlocked) */
  const isModeAvailable = (modeId: string): boolean => {
    if (FREE_MODES.includes(modeId)) return true;
    if (unlockedModes) return unlockedModes.includes(modeId);
    // If unlockedModes not provided (e.g., backend not ready), default medication to locked
    return false;
  };

  const toggle = (id: string) => {
    haptic.selection();
    const next = selected.includes(id)
      ? selected.filter((m) => m !== id)
      : [...selected, id];
    setSelected(next);
    onSelect(next);
  };

  const handleLockedTap = useCallback((id: string) => {
    haptic.notification('warning');
    setShakingCard(id);
    // If unlock callbacks are available, show the modal
    if (onUnlockWithStars && onUnlockWithXP) {
      setUnlockModalMode(id);
    } else {
      setLockToast(true);
      setTimeout(() => setLockToast(false), 2500);
    }
    setTimeout(() => setShakingCard(null), 400);
  }, [haptic, onUnlockWithStars, onUnlockWithXP]);

  const shakeKeyframes = { x: [0, -4, 4, -3, 3, 0] };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-telegram-text text-center mb-2">
            {t('onboarding.whatToImprove')}
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            {t('onboarding.pickAreas')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode, i) => {
            const available = isModeAvailable(mode.id);
            const isSelected = selected.includes(mode.id);
            return (
              <motion.button
                key={mode.id}
                onClick={() => available ? toggle(mode.id) : handleLockedTap(mode.id)}
                className={`
                  relative rounded-2xl p-4 text-left border-2 overflow-hidden
                  ${
                    !available
                      ? 'opacity-60 border-telegram-hint/20 bg-telegram-secondaryBg cursor-not-allowed'
                      : isSelected
                      ? `${mode.color} shadow-lg`
                      : 'border-telegram-hint/20 bg-telegram-secondaryBg'
                  }
                `}
                style={isSelected ? {
                  boxShadow: `0 0 12px 2px ${mode.color.includes('red') ? 'rgba(239,68,68,0.25)' : mode.color.includes('blue') ? 'rgba(59,130,246,0.25)' : mode.color.includes('green') ? 'rgba(34,197,94,0.25)' : 'rgba(168,85,247,0.25)'}`,
                } : undefined}
                initial={{ opacity: 0, y: 20 }}
                animate={
                  shakingCard === mode.id
                    ? shakeKeyframes
                    : { opacity: 1, y: 0 }
                }
                transition={
                  shakingCard === mode.id
                    ? { duration: 0.3 }
                    : { delay: i * 0.1 }
                }
                whileHover={available ? { scale: 1.02 } : undefined}
                whileTap={available ? { scale: 0.95 } : undefined}
              >
                {/* Pulse glow ring for selected cards */}
                {isSelected && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 pointer-events-none"
                    style={{
                      borderColor: mode.color.includes('red') ? 'rgba(239,68,68,0.4)' : mode.color.includes('blue') ? 'rgba(59,130,246,0.4)' : mode.color.includes('green') ? 'rgba(34,197,94,0.4)' : 'rgba(168,85,247,0.4)',
                    }}
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                {!available && (
                  <div className="absolute top-2 right-2 bg-telegram-hint/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-telegram-hint" />
                    <span className="text-[10px] text-telegram-hint font-medium">300 ⭐ / 10K XP</span>
                  </div>
                )}
                <span className="text-3xl block mb-2">{mode.icon}</span>
                <h3 className="font-semibold text-sm text-telegram-text mb-1">{t(mode.nameKey)}</h3>
                <p className="text-xs text-telegram-hint leading-snug">{t(mode.descKey)}</p>
              </motion.button>
            );
          })}
        </div>

        {/* Lock toast */}
        <AnimatePresence>
          {lockToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-4 text-center text-sm text-telegram-hint bg-telegram-secondaryBg rounded-xl py-2 px-4"
            >
              🔒 {t('onboarding.unlockHint', { defaultValue: 'Unlock with 300 Stars or 10,000 XP' })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-6 pb-8">
        <ContinueButton
          onClick={onNext}
          disabled={selected.length === 0}
          label={selected.length > 0 ? t('onboarding.continueSelected', { count: selected.length }) : t('onboarding.selectAtLeast1')}
        />
      </div>

      {/* Mode unlock modal */}
      {unlockModalMode && (() => {
        const modeData = MODES.find((m) => m.id === unlockModalMode);
        if (!modeData) return null;
        return (
          <ModeUnlockModal
            isOpen={!!unlockModalMode}
            onClose={() => setUnlockModalMode(null)}
            modeName={unlockModalMode}
            modeIcon={modeData.icon}
            modeDisplayName={t(modeData.nameKey)}
            userXP={userXP}
            isUnlocking={isUnlocking}
            error={unlockError}
            onUnlockWithStars={() => onUnlockWithStars?.(unlockModalMode)}
            onUnlockWithXP={() => onUnlockWithXP?.(unlockModalMode)}
          />
        );
      })()}
    </div>
  );
}
