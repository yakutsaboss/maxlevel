import { useState } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { CheckCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CheckInButtonProps {
  questInstanceId: number;
  telegramId: number;
  onSuccess: (result: { completed: boolean; current: number; target: number }) => void;
  disabled?: boolean;
}

export function CheckInButton({ questInstanceId, telegramId, onSuccess, disabled }: CheckInButtonProps) {
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
          current: response.data.quest_progress.current,
          target: response.data.quest_progress.target,
        });
        setTimeout(() => setShowSuccess(false), 1500);
      }
    } catch (error) {
      console.error('Check-in failed:', error);
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
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <CheckCircle className="w-5 h-5" />
        )}
        {loading ? 'Checking in...' : 'Check In'}
      </motion.button>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white text-sm font-medium px-3 py-1 rounded-full whitespace-nowrap"
          >
            Checked in!
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
