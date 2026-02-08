import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';

interface HeroIntroProps {
  progress: number;
  onNext: () => void;
}

export function HeroIntro({ progress, onNext }: HeroIntroProps) {
  const { user, haptic } = useTelegram();
  const name = user?.first_name || 'Hero';

  const handleAccept = () => {
    haptic.notification('success');
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} />

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <motion.div
          className="relative w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Notification badge */}
          <motion.div
            className="absolute -top-3 right-4 bg-white rounded-xl px-3 py-1.5 shadow-md flex items-center gap-1.5 z-10"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
              <Bell className="w-3 h-3 text-white" />
            </div>
            <span className="text-xs font-medium text-gray-800">Notification</span>
          </motion.div>

          {/* Main card with glow border */}
          <div
            className="rounded-3xl p-6 border-2 border-purple-400 bg-telegram-secondaryBg"
            style={{
              boxShadow: '0 0 20px rgba(168, 85, 247, 0.3), inset 0 0 20px rgba(168, 85, 247, 0.05)',
            }}
          >
            {/* Inner card */}
            <div className="bg-telegram-bg rounded-2xl p-5 text-center">
              <p className="text-sm text-telegram-hint mb-1">Player Name</p>
              <h2 className="text-2xl font-bold text-telegram-text mb-4">{name}</h2>
              <p className="text-telegram-text leading-relaxed">
                Do you want to improve your life? I can help you level up every aspect of it!
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-8">
        <motion.button
          onClick={handleAccept}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold shadow-lg"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileTap={{ scale: 0.97 }}
        >
          Accept the Call
        </motion.button>
      </div>
    </div>
  );
}
