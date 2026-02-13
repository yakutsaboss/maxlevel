import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface XpFloatProps {
  amount: number;
  show: boolean;
  onComplete?: () => void;
}

export function XpFloat({ amount, show, onComplete }: XpFloatProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onComplete?.(), 1500);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 0, opacity: 1, scale: 0.8 }}
          animate={{ y: -60, opacity: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          className="fixed top-20 left-1/2 z-[80] pointer-events-none"
          style={{ transform: 'translateX(-50%)' }}
        >
          <span
            className="text-xl font-bold"
            style={{
              color: '#4ECDC4',
              textShadow: '0 1px 8px rgba(78, 205, 196, 0.5)',
            }}
          >
            +{amount} XP
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
