import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  stepLabel?: string;
}

export function ProgressBar({ progress, stepLabel }: ProgressBarProps) {
  return (
    <div className="w-full px-4 pt-3 pb-1">
      <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        {stepLabel ? (
          <span className="text-xs text-telegram-hint">{stepLabel}</span>
        ) : (
          <span />
        )}
        <span className="text-xs text-telegram-hint">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
