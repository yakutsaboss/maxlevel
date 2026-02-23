import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from './Confetti';

interface QuestCompletionCelebrationProps {
  show: boolean;
  questName?: string;
  onComplete?: () => void;
}

export function QuestCompletionCelebration({ show, questName, onComplete }: QuestCompletionCelebrationProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => onComplete?.(), 3000);
    return () => clearTimeout(timer);
  }, [show, onComplete]);

  return (
    <>
      <Confetti show={show} />
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50"
            onClick={onComplete}
          >
            <motion.div
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="flex flex-col items-center gap-3 px-10 py-8"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ type: 'spring', damping: 8, stiffness: 200 }}
                className="text-7xl"
              >
                👍
              </motion.div>

              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-extrabold text-white"
                style={{ textShadow: '0 2px 20px rgba(255,255,255,0.4)' }}
              >
                All Done!
              </motion.span>

              {questName && (
                <motion.span
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="text-sm text-white/70 text-center max-w-[200px]"
                >
                  {questName}
                </motion.span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
