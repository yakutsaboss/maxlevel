import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Zap, Sparkles } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface LaunchScreenProps {
  data: OnboardingData;
  telegramId: number;
  onLaunch: () => void;
}

export function LaunchScreen({ data, telegramId, onLaunch }: LaunchScreenProps) {
  const { haptic } = useTelegram();
  const [xpCount, setXpCount] = useState(0);
  const [saving, setSaving] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    completeOnboarding();
  }, []);

  // Animated XP counter
  useEffect(() => {
    if (saving) return;
    const target = 50;
    const duration = 1000;
    const steps = 20;
    const increment = target / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= target) {
        setXpCount(target);
        clearInterval(interval);
      } else {
        setXpCount(Math.round(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [saving]);

  const completeOnboarding = async () => {
    try {
      setSaving(true);
      await apiClient.completeOnboarding(telegramId, data);
      setSaving(false);
      haptic.notification('success');
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError('Failed to save. Please try again.');
      setSaving(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-telegram-bg">
        <p className="text-red-400 text-center mb-4">{error}</p>
        <button
          onClick={completeOnboarding}
          className="px-6 py-3 rounded-xl bg-telegram-link text-white font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  if (saving) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-telegram-bg">
        <div className="animate-pulse text-telegram-hint text-lg">Preparing your quest...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-16 px-6 bg-telegram-bg overflow-hidden">
      <div />

      <div className="flex flex-col items-center">
        {/* Confetti particles */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              backgroundColor: ['#a855f7', '#3b82f6', '#f59e0b', '#ef4444', '#10b981'][i % 5],
              left: `${10 + Math.random() * 80}%`,
            }}
            initial={{ y: -20, opacity: 0 }}
            animate={{
              y: [0, 300 + Math.random() * 200],
              opacity: [1, 0],
              rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
            }}
            transition={{
              duration: 2 + Math.random(),
              delay: Math.random() * 0.5,
              ease: 'easeOut',
            }}
          />
        ))}

        {/* Level badge */}
        <motion.div
          className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl mb-6"
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="text-center">
            <div className="text-white text-4xl font-bold">1</div>
            <div className="text-white/80 text-xs font-medium">LEVEL</div>
          </div>
        </motion.div>

        <motion.h1
          className="text-3xl font-bold text-telegram-text mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Quest Begins!
        </motion.h1>

        {/* XP animation */}
        <motion.div
          className="flex items-center gap-2 mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Zap className="w-5 h-5 text-yellow-500" />
          <span className="text-2xl font-bold text-yellow-500">+{xpCount} XP</span>
        </motion.div>

        {/* Achievement */}
        <motion.div
          className="bg-telegram-secondaryBg rounded-2xl px-5 py-3 flex items-center gap-3 mb-6"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          <Trophy className="w-6 h-6 text-purple-400" />
          <div>
            <p className="text-sm font-semibold text-telegram-text">Achievement Unlocked!</p>
            <p className="text-xs text-telegram-hint">First Steps</p>
          </div>
          <Sparkles className="w-4 h-4 text-yellow-400" />
        </motion.div>

        <motion.p
          className="text-telegram-hint text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Your first quests have been created!
        </motion.p>
      </div>

      <motion.button
        onClick={() => { haptic.impact('heavy'); onLaunch(); }}
        className="w-full py-4 rounded-2xl text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        whileTap={{ scale: 0.97 }}
      >
        Enter Your Realm
      </motion.button>
    </div>
  );
}
