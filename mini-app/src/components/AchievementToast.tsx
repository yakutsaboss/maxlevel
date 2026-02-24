import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Achievement } from '@/types';
import { Zap, Share2 } from 'lucide-react';
import { Confetti } from '@/components/celebrations/Confetti';
import { LottieSticker } from '@/components/celebrations/LottieSticker';
import trophyAnimation from '@/assets/lottie/trophy.json';
import { useCelebrationStyle } from '@/hooks/useCelebrationStyle';
import { isShareToStoryAvailable, shareAchievementToStory } from '@/utils/storyShare';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(true);
  const [shared, setShared] = useState(false);
  const { isAnimated } = useCelebrationStyle();

  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <>
      <Confetti show={showConfetti} onComplete={() => setShowConfetti(false)} />
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="fixed bottom-24 left-4 right-4 z-60 safe-area-bottom"
      >
        <div
          className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl p-4 shadow-lg border border-amber-400/50"
          onClick={onClose}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 flex-shrink-0">
              {isAnimated ? (
                <LottieSticker animationData={trophyAnimation} size={48} />
              ) : (
                <span className="text-3xl">{achievement.icon || '🏆'}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-900/70 uppercase tracking-wider">{t('achievements.achievementUnlocked')}</div>
              <div className="text-base font-bold text-white truncate mt-0.5">{achievement.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <Zap className="w-3.5 h-3.5 text-white" />
                <span className="text-sm font-semibold text-white">+{achievement.xp_reward} XP</span>
              </div>
            </div>
            {isShareToStoryAvailable() && (
              <button
                className="flex-shrink-0 p-2 rounded-full bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  if (shared) return;
                  shareAchievementToStory(achievement.name, achievement.rarity || 'common').then((ok) => {
                    if (ok) setShared(true);
                  });
                }}
                aria-label={t('share.toStory')}
              >
                <Share2 className={`w-4 h-4 ${shared ? 'text-green-200' : 'text-white'}`} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
