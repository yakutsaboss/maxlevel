import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

interface ContinueButtonProps {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}

const shakeKeyframes = {
  x: [0, -6, 6, -4, 4, -2, 2, 0],
};

export function ContinueButton({
  onClick,
  disabled = false,
  label,
  className,
}: ContinueButtonProps) {
  const { t } = useTranslation();
  const [shaking, setShaking] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleClick = useCallback(() => {
    if (disabled) {
      setShaking(true);
      setShowHint(true);
      setTimeout(() => setShaking(false), 400);
      setTimeout(() => setShowHint(false), 2000);
      return;
    }
    onClick();
  }, [disabled, onClick]);

  return (
    <div>
      <motion.button
        onClick={handleClick}
        animate={shaking ? shakeKeyframes : { x: 0 }}
        transition={shaking ? { duration: 0.4 } : undefined}
        className={
          className ||
          `w-full py-4 rounded-2xl text-lg font-bold transition-all ${
            disabled
              ? 'bg-telegram-hint/20 text-telegram-hint'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
          }`
        }
      >
        {label || t('onboarding.continue')}
      </motion.button>
      {showHint && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="text-xs text-red-400 text-center mt-2"
        >
          {t('onboarding.pleaseSelectHint')}
        </motion.p>
      )}
    </div>
  );
}
