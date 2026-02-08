import { motion } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
}

export function ProgressBar({ progress }: ProgressBarProps) {
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
      <div className="text-right mt-1">
        <span className="text-xs text-telegram-hint">{Math.round(progress)}%</span>
      </div>
    </div>
  );
}
