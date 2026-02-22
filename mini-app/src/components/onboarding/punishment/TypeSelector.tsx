import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PUNISHMENT_TYPES, type PunishmentType } from './constants';

interface TypeSelectorProps {
  punishmentType: PunishmentType | null;
  onSelectType: (type: PunishmentType) => void;
  onNext: () => void;
}

export function TypeSelector({ punishmentType, onSelectType, onNext }: TypeSelectorProps) {
  const { t } = useTranslation();
  return (
    <motion.div
      key="type-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-3"
    >
      <p className="text-sm font-medium text-telegram-text mb-1">
        {t('onboardingQuiz.punishment.chooseType')}
      </p>

      {PUNISHMENT_TYPES.map((pt) => {
        const selected = punishmentType === pt.value;
        return (
          <motion.button
            key={pt.value}
            onClick={() => onSelectType(pt.value)}
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
                <p className="text-telegram-text font-bold text-lg">{t(pt.labelKey)}</p>
                <p className="text-telegram-hint text-sm mt-0.5">{t(pt.taglineKey)}</p>
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
          onClick={onNext}
          className="w-full py-3.5 mt-2 rounded-2xl text-base font-bold bg-telegram-button text-telegram-buttonText"
        >
          {t('common.next')}
        </motion.button>
      )}
    </motion.div>
  );
}
