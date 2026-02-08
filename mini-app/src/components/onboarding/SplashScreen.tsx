import { motion } from 'framer-motion';
import { Sword } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

interface SplashScreenProps {
  onNext: () => void;
}

export function SplashScreen({ onNext }: SplashScreenProps) {
  const { haptic } = useTelegram();

  const handleStart = () => {
    haptic.impact('medium');
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-16 px-6 bg-telegram-bg">
      <div />

      <motion.div
        className="flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-8 shadow-lg"
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
        >
          <Sword className="w-12 h-12 text-white" />
        </motion.div>

        <h1 className="text-4xl font-bold text-telegram-text text-center mb-3">
          MaxLevel
        </h1>
        <p className="text-telegram-hint text-center text-lg">
          Level up your real life
        </p>
      </motion.div>

      <motion.button
        onClick={handleStart}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold shadow-lg"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        whileTap={{ scale: 0.97 }}
      >
        Begin Your Quest
      </motion.button>
    </div>
  );
}
