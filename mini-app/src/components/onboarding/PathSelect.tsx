import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { ContinueButton } from './ui/ContinueButton';

const MODES = [
  {
    id: 'fitness',
    nameKey: 'onboarding.modeFitness',
    descKey: 'onboarding.modeFitnessDesc',
    icon: '🏋️',
    color: 'border-red-500 bg-red-500/10',
    available: true,
  },
  {
    id: 'hydration',
    nameKey: 'onboarding.modeHydration',
    descKey: 'onboarding.modeHydrationDesc',
    icon: '💧',
    color: 'border-blue-500 bg-blue-500/10',
    available: true,
  },
  {
    id: 'medication',
    nameKey: 'onboarding.modeMedication',
    descKey: 'onboarding.modeMedicationDesc',
    icon: '💊',
    color: 'border-green-500 bg-green-500/10',
    available: true,
  },
  {
    id: 'habits',
    nameKey: 'onboarding.modeHabits',
    descKey: 'onboarding.modeHabitsDesc',
    icon: '🎯',
    color: 'border-purple-500 bg-purple-500/10',
    available: true,
  },
];

interface PathSelectProps {
  progress: number;
  stepLabel?: string;
  value?: string[];
  onSelect: (modes: string[]) => void;
  onNext: () => void;
}

export function PathSelect({ progress, stepLabel, value, onSelect, onNext }: PathSelectProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState<string[]>(value || []);

  const toggle = (id: string) => {
    haptic.selection();
    const next = selected.includes(id)
      ? selected.filter((m) => m !== id)
      : [...selected, id];
    setSelected(next);
    onSelect(next);
  };

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
            const isSelected = selected.includes(mode.id);
            return (
              <motion.button
                key={mode.id}
                onClick={() => mode.available && toggle(mode.id)}
                className={`
                  relative rounded-2xl p-4 text-left transition-all border-2
                  ${
                    !mode.available
                      ? 'opacity-50 border-telegram-hint/20 bg-telegram-secondaryBg cursor-not-allowed'
                      : isSelected
                      ? `${mode.color} shadow-lg`
                      : 'border-telegram-hint/20 bg-telegram-secondaryBg'
                  }
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={mode.available ? { scale: 0.95 } : undefined}
              >
                {!mode.available && (
                  <div className="absolute top-2 right-2 bg-telegram-hint/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-telegram-hint" />
                    <span className="text-[10px] text-telegram-hint font-medium">{t('onboarding.soon')}</span>
                  </div>
                )}
                <span className="text-3xl block mb-2">{mode.icon}</span>
                <h3 className="font-semibold text-sm text-telegram-text mb-1">{t(mode.nameKey)}</h3>
                <p className="text-xs text-telegram-hint leading-snug">{t(mode.descKey)}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8">
        <ContinueButton
          onClick={onNext}
          disabled={selected.length === 0}
          label={selected.length > 0 ? t('onboarding.continueSelected', { count: selected.length }) : t('onboarding.selectAtLeast1')}
        />
      </div>
    </div>
  );
}
