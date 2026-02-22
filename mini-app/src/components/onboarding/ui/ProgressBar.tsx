import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';

interface ProgressBarProps {
  progress: number;
  stepLabel?: string;
}

export function ProgressBar({ progress, stepLabel }: ProgressBarProps) {
  const prevProgress = useRef(progress);
  const [displayPercent, setDisplayPercent] = useState(Math.round(progress));

  // Animated counter motion value — drives the displayed number
  const motionProgress = useMotionValue(progress);

  // Track whether progress just jumped (step completed)
  const glowOpacity = useMotionValue(0);

  useEffect(() => {
    const prev = prevProgress.current;
    if (progress !== prev) {
      // Animate the counter smoothly
      const controls = animate(motionProgress, progress, {
        duration: 0.5,
        ease: 'easeOut',
        onUpdate: (v) => setDisplayPercent(Math.round(v)),
      });

      // Flash glow on progress increase
      if (progress > prev) {
        animate(glowOpacity, [0, 0.8, 0], { duration: 0.4, ease: 'easeOut' });
      }
      prevProgress.current = progress;
      return controls.stop;
    }
  }, [progress, motionProgress, glowOpacity]);

  return (
    <div className="w-full px-4 pt-3 pb-1">
      <div className="bg-telegram-hint/20 rounded-full h-2.5 overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full relative"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(progress, 100)}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 8px rgba(251, 191, 36, 0.4), 0 0 16px rgba(249, 115, 22, 0.2)',
          }}
        />
        {/* Pulse overlay on step completion */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 rounded-full"
          style={{
            opacity: glowOpacity,
            width: `${Math.min(progress, 100)}%`,
          }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        {stepLabel ? (
          <span className="text-xs text-telegram-hint">{stepLabel}</span>
        ) : (
          <span />
        )}
        <span className="text-xs text-telegram-hint tabular-nums">
          {displayPercent}%
        </span>
      </div>
    </div>
  );
}
