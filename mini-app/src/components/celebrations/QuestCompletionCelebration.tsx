import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2 } from 'lucide-react';
import { Confetti } from './Confetti';
import { LottieSticker } from './LottieSticker';
import thumbsUpAnimation from '@/assets/lottie/thumbs-up.json';
import { isShareToStoryAvailable, shareQuestToStory } from '@/utils/storyShare';

interface QuestCompletionCelebrationProps {
  show: boolean;
  questName?: string;
  onComplete?: () => void;
}

export function QuestCompletionCelebration({ show, questName, onComplete }: QuestCompletionCelebrationProps) {
  const { t } = useTranslation();
  const celebrationStyle = localStorage.getItem('celebration-style') || 'emoji';
  const [shared, setShared] = useState(false);

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
                {celebrationStyle === 'animated' ? (
                  <LottieSticker animationData={thumbsUpAnimation} size={80} />
                ) : (
                  '👍'
                )}
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

              {isShareToStoryAvailable() && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex items-center gap-1.5 px-3 py-1.5 mt-1 rounded-full bg-white/20 text-white text-xs font-medium"
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (shared) return;
                    const ok = await shareQuestToStory(questName || 'a quest');
                    if (ok) setShared(true);
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {shared ? t('share.success') : t('share.toStory')}
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
