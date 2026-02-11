import { Vibrate } from 'lucide-react';
import { motion } from 'framer-motion';
import { setHapticEnabled } from '@/hooks/useTelegram';

interface HapticFeedbackSettingsProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export function HapticFeedbackSettings({ enabled, onChange }: HapticFeedbackSettingsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.14 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
            <Vibrate className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Haptic Feedback</h3>
            <p className="text-xs text-telegram-hint">Vibration on button taps</p>
          </div>
        </div>
        <button
          onClick={() => {
            const next = !enabled;
            setHapticEnabled(next);
            onChange(next);
          }}
          role="switch"
          aria-checked={enabled}
          aria-label={`Haptic feedback: ${enabled ? 'on' : 'off'}`}
          className={`w-12 h-7 rounded-full transition-colors relative ${enabled ? 'bg-telegram-link' : 'bg-telegram-hint/30'}`}
        >
          <motion.div
            className="w-5 h-5 bg-white rounded-full absolute top-1 shadow-sm"
            animate={{ left: enabled ? 26 : 4 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>
    </motion.div>
  );
}
