import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/utils/logger';

interface CheckInButtonProps {
  questInstanceId: number;
  telegramId: number;
  onSuccess: (result: { completed: boolean; current: number; target: number }) => void;
  disabled?: boolean;
  currentProgress?: number;
  target?: number;
}

export function CheckInButton({ questInstanceId, telegramId, onSuccess, disabled, currentProgress, target }: CheckInButtonProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleCheckin = async () => {
    if (loading || disabled) return;
    haptic.impact('medium');
    setLoading(true);
    try {
      const response = await apiClient.createCheckin(telegramId, questInstanceId);
      if (response.success && response.data) {
        haptic.notification('success');
        setShowSuccess(true);
        onSuccess({
          completed: response.data.completed,
          current: response.data.quest_progress?.current ?? 0,
          target: response.data.quest_progress?.target ?? 1,
        });
        setTimeout(() => setShowSuccess(false), 1500);
      }
    } catch (error) {
      logger.error('Check-in failed', { error });
      haptic.notification('error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <motion.button
        onClick={handleCheckin}
        disabled={loading || disabled}
        whileTap={{ scale: 0.95 }}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-semibold text-white transition-all ${
          disabled
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-500 to-emerald-600 active:from-green-600 active:to-emerald-700 shadow-lg shadow-green-500/25'
        }`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          <CheckCircle className="w-5 h-5" aria-hidden="true" />
        )}
        {loading ? t('quests.checkingIn') : (() => {
          if (currentProgress !== undefined && target !== undefined && target > 1) {
            const remaining = target - currentProgress;
            if (remaining <= 1) return t('quests.checkInLastOne');
            return t('quests.checkInRemaining', { count: remaining });
          }
          return t('dashboard.checkIn');
        })()}
      </motion.button>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap"
            role="status"
            aria-live="polite"
          >
            {t('quests.checkedIn')}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
