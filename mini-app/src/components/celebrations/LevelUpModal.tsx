import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FocusTrap } from '@/components/FocusTrap';
import { LottieSticker } from './LottieSticker';
import starBurstAnimation from '@/assets/lottie/star-burst.json';
import { useCelebrationStyle } from '@/hooks/useCelebrationStyle';

interface LevelUpModalProps {
  level: number;
  show: boolean;
  onClose: () => void;
}

export function LevelUpModal({ level, show, onClose }: LevelUpModalProps) {
  const { t } = useTranslation();
  const { isAnimated } = useCelebrationStyle();

  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <FocusTrap onEscape={onClose} autoFocus={false} aria-label={t('celebrations.levelUp')}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="relative flex flex-col items-center gap-3 px-10 py-8 rounded-3xl"
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: '0 0 40px 10px rgba(102, 126, 234, 0.5)' }}
            />

            {isAnimated ? (
              <LottieSticker animationData={starBurstAnimation} size={100} />
            ) : (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
                className="text-5xl"
              >
                ⭐
              </motion.div>
            )}

            <span className="text-sm font-bold uppercase tracking-widest text-white/80">
              {t('celebrations.levelUp')}
            </span>

            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.2 }}
              className="text-6xl font-extrabold text-white"
              style={{ textShadow: '0 2px 20px rgba(255,255,255,0.4)' }}
            >
              {level}
            </motion.span>

            <span className="text-xs text-white/60">
              {t('celebrations.tapToDismiss')}
            </span>
          </motion.div>
        </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
