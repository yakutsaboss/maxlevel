import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';

interface SplashScreenProps {
  onNext: () => void;
}

const LANGUAGES = [
  { code: 'en', flag: '🇺🇸', label: 'English', available: true },
  { code: 'ru', flag: '🇷🇺', label: 'Русский', available: true },
  { code: 'zh', flag: '🇨🇳', label: '中文', available: false },
] as const;

// Falling stars that rise from below (like we're ascending)
function RisingStars() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 8 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-yellow-400"
          style={{
            left: `${10 + Math.random() * 80}%`,
            bottom: `-5%`,
          }}
          animate={{
            y: [0, -window.innerHeight * 1.2],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1.5, 1, 0.3],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            delay: i * 0.6,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      ))}
    </div>
  );
}

export function SplashScreen({ onNext }: SplashScreenProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const handleStart = () => {
    if (!selectedLang) return;
    haptic.impact('medium');
    onNext();
  };

  const handleLangSelect = (code: string, available: boolean) => {
    if (!available) return;
    haptic.selection();
    setSelectedLang(code);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between py-16 px-6 bg-telegram-bg relative">
      <RisingStars />

      <div />

      <motion.div
        className="flex flex-col items-center relative z-10"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="w-24 h-24 rounded-3xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center mb-8 shadow-lg shadow-amber-500/30"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <TrendingUp className="w-12 h-12 text-white" strokeWidth={2.5} />
        </motion.div>

        <h1 className="text-4xl font-bold text-telegram-text text-center mb-3">
          MaxLevel
        </h1>
        <p className="text-telegram-hint text-center text-lg mb-8">
          {t('onboarding.tagline')}
        </p>

        {/* Language selection */}
        <motion.div
          className="flex items-center gap-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLangSelect(lang.code, lang.available)}
              className={`relative flex flex-col items-center transition-all duration-200 ${
                lang.available
                  ? selectedLang === lang.code
                    ? 'scale-110'
                    : 'opacity-80 hover:opacity-100'
                  : 'cursor-default'
              }`}
            >
              {!lang.available && (
                <span className="text-[10px] text-telegram-hint font-medium mb-0.5">
                  {t('onboarding.soon')}
                </span>
              )}
              {lang.available && <span className="text-[10px] mb-0.5 invisible">{t('onboarding.soon')}</span>}
              <span
                className={`text-3xl transition-all duration-200 ${
                  !lang.available ? 'grayscale opacity-40' : ''
                } ${
                  selectedLang === lang.code
                    ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-telegram-bg rounded-md'
                    : ''
                }`}
              >
                {lang.flag}
              </span>
            </button>
          ))}
        </motion.div>
      </motion.div>

      <motion.button
        onClick={handleStart}
        disabled={!selectedLang}
        className={`w-full py-4 rounded-2xl text-lg font-bold shadow-lg transition-all duration-300 relative z-10 ${
          selectedLang
            ? 'bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-amber-500/25'
            : 'bg-gray-600/30 text-gray-500 cursor-not-allowed'
        }`}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        whileTap={selectedLang ? { scale: 0.97 } : {}}
      >
        {t('onboarding.getStarted')}
      </motion.button>
    </div>
  );
}
