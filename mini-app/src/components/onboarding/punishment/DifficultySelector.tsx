import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PUNISHMENT_TYPES, DIFFICULTY_MAP, type PunishmentType, type Difficulty } from './constants';

interface DifficultySelectorProps {
  punishmentType: PunishmentType;
  difficulty: Difficulty;
  safeMode: boolean;
  onSelectDifficulty: (d: Difficulty) => void;
  onToggleSafe: () => void;
  onBack: () => void;
}

export function DifficultySelector({
  punishmentType, difficulty, safeMode,
  onSelectDifficulty, onToggleSafe, onBack,
}: DifficultySelectorProps) {
  const { t } = useTranslation();
  const typeInfo = PUNISHMENT_TYPES.find((pt) => pt.value === punishmentType);

  return (
    <motion.div
      key="difficulty-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      <button onClick={onBack} className="text-sm text-telegram-link font-medium mb-1">
        &larr; {t('onboardingQuiz.punishment.changeType')}
      </button>

      <p className="text-sm font-medium text-telegram-text">
        {t('onboardingQuiz.punishment.howTough')} ({typeInfo?.emoji} {typeInfo ? t(typeInfo.labelKey) : ''})
      </p>

      {DIFFICULTY_MAP[punishmentType].map((d) => {
        const selected = difficulty === d.value;
        return (
          <motion.button
            key={d.value}
            onClick={() => onSelectDifficulty(d.value)}
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
                {t(d.labelKey)}
              </span>
              <span className="text-telegram-hint text-xs capitalize">{d.value}</span>
            </div>
          </motion.button>
        );
      })}

      <div className="bg-telegram-secondaryBg rounded-2xl p-4 mt-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-telegram-text text-sm">{t('onboardingQuiz.punishment.safeMode')}</p>
            <p className="text-xs text-telegram-hint mt-0.5">
              {t('onboardingQuiz.punishment.safeModeDesc')}
            </p>
          </div>
          <button
            onClick={onToggleSafe}
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
  );
}
