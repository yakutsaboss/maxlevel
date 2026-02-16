import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const CONFETTI_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A'];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    delay: Math.random() * 0.3,
  }));
}

interface PurchaseSuccessAnimationProps {
  show: boolean;
  iconEmoji: string;
  onDismiss: () => void;
}

export function PurchaseSuccessAnimation({
  show,
  iconEmoji,
  onDismiss,
}: PurchaseSuccessAnimationProps) {
  const { t } = useTranslation();
  const particles = useMemo(() => generateParticles(45), []);

  // Auto-dismiss after 3 seconds
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [show, onDismiss]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70"
          onClick={onDismiss}
        >
          {/* Confetti particles */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{
                  x: `${p.x}vw`,
                  y: '-5vh',
                  rotate: 0,
                  opacity: 1,
                }}
                animate={{
                  y: '110vh',
                  rotate: p.rotation + 720,
                  opacity: [1, 1, 0.8, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 0.8,
                  delay: p.delay,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                style={{
                  position: 'absolute',
                  width: p.size,
                  height: p.size,
                  backgroundColor: p.color,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                }}
              />
            ))}
          </div>

          {/* Success card */}
          <motion.div
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
            className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Glow ring */}
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 rounded-3xl"
              style={{ boxShadow: '0 0 40px 10px rgba(16, 185, 129, 0.5)' }}
            />

            {/* Item icon popping in */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 200, delay: 0.15 }}
              className="text-6xl"
            >
              {iconEmoji || '🎉'}
            </motion.div>

            {/* Pulsing emoji */}
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 0.8 }}
              className="text-3xl"
            >
              ✅
            </motion.div>

            {/* "Purchase Complete!" text */}
            <motion.span
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="text-lg font-bold text-white text-center"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}
            >
              {t('shop.purchaseComplete')}
            </motion.span>

            {/* Continue button */}
            <motion.button
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={onDismiss}
              className="mt-2 px-8 py-2 rounded-full bg-white/20 text-white text-sm font-medium active:bg-white/30 transition-colors"
            >
              {t('shop.continue')}
            </motion.button>

            {/* Tap to dismiss hint */}
            <span className="text-xs text-white/60">
              {t('shop.tapToDismiss')}
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
