import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Achievement } from '@/types';
import { Zap } from 'lucide-react';
import { Confetti } from '@/components/celebrations/Confetti';

interface AchievementToastProps {
  achievement: Achievement;
  onClose: () => void;
}

export function AchievementToast({ achievement, onClose }: AchievementToastProps) {
  const { t } = useTranslation();
  const [showConfetti, setShowConfetti] = useState(true);

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
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-2.5 text-3xl flex-shrink-0">
              {achievement.icon || '🏆'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-amber-900/70 uppercase tracking-wider">{t('achievements.achievementUnlocked')}</div>
              <div className="text-base font-bold text-white truncate mt-0.5">{achievement.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <Zap className="w-3.5 h-3.5 text-white" />
                <span className="text-sm font-semibold text-white">+{achievement.xp_reward} XP</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
