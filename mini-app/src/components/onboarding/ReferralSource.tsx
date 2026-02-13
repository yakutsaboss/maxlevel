import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { ContinueButton } from './ui/ContinueButton';
import { REFERRAL_OPTIONS } from '@/data/onboardingQuestions';

interface ReferralSourceProps {
  progress: number;
  stepLabel?: string;
  value?: string;
  otherValue?: string;
  onSelect: (source: string, otherText?: string) => void;
  onNext: () => void;
}

export function ReferralSource({ progress, stepLabel, value, otherValue, onSelect, onNext }: ReferralSourceProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState(value || '');
  const [otherText, setOtherText] = useState(otherValue || '');

  const handleSelect = (v: string) => {
    haptic.selection();
    setSelected(v);
    onSelect(v, v === 'other' ? otherText : undefined);
  };

  const handleOtherChange = (text: string) => {
    setOtherText(text);
    onSelect('other', text);
  };

  const isValid = selected && (selected !== 'other' || otherText.trim().length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-telegram-text text-center mb-2">
            {t('onboarding.howDidYouFind')}
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            {t('onboarding.whereHeardAbout')}
          </p>
        </motion.div>

        <div className="space-y-2">
          {REFERRAL_OPTIONS.map((option, i) => (
            <motion.button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`
                w-full py-3.5 px-4 rounded-xl text-left transition-all
                ${
                  selected === option.value
                    ? 'bg-telegram-link/15 border-2 border-telegram-link'
                    : 'bg-telegram-secondaryBg border-2 border-transparent'
                }
              `}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className={`font-medium ${
                selected === option.value ? 'text-telegram-link' : 'text-telegram-text'
              }`}>
                {option.label}
              </span>
            </motion.button>
          ))}

          {selected === 'other' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <input
                type="text"
                value={otherText}
                onChange={(e) => handleOtherChange(e.target.value)}
                placeholder={t('onboarding.tellUsWhere')}
                className="w-full py-3 px-4 rounded-xl bg-telegram-secondaryBg border-2 border-telegram-hint/30 text-telegram-text placeholder:text-telegram-hint/50 focus:border-telegram-link focus:outline-none mt-2"
                autoFocus
              />
            </motion.div>
          )}
        </div>
      </div>

      <div className="px-6 pb-8">
        <ContinueButton onClick={onNext} disabled={!isValid} />
      </div>
    </div>
  );
}
