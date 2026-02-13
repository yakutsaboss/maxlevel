import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { AVATAR_OPTIONS } from '@/data/avatarOptions';
import { ProgressBar } from './ui/ProgressBar';
import { ContinueButton } from './ui/ContinueButton';

interface AvatarSelectProps {
  progress: number;
  stepLabel?: string;
  value?: string;
  onSelect: (avatar: string) => void;
  onNext: () => void;
}

export function AvatarSelect({ progress, stepLabel, value, onSelect, onNext }: AvatarSelectProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState(value || '');

  const handleSelect = (v: string) => {
    haptic.selection();
    setSelected(v);
    onSelect(v);
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
            {t('onboarding.pickCharacter')}
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            {t('onboarding.whichSoundsLikeYou')}
          </p>
        </motion.div>

        <div className="space-y-2.5">
          {AVATAR_OPTIONS.map((avatar, i) => (
            <motion.button
              key={avatar.value}
              onClick={() => handleSelect(avatar.value)}
              className={`
                w-full py-3.5 px-4 rounded-2xl flex items-center gap-3.5 transition-all
                ${
                  selected === avatar.value
                    ? 'bg-telegram-link/15 border-2 border-telegram-link shadow-lg shadow-telegram-link/10'
                    : 'bg-telegram-secondaryBg border-2 border-transparent'
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl">{avatar.emoji}</span>
              <div className="text-left">
                <span className={`text-base font-semibold block ${
                  selected === avatar.value ? 'text-telegram-link' : 'text-telegram-text'
                }`}>
                  {t(avatar.labelKey)}
                </span>
                <span className="text-xs text-telegram-hint">{t(avatar.descKey)}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8">
        <ContinueButton onClick={onNext} disabled={!selected} />
      </div>
    </div>
  );
}
