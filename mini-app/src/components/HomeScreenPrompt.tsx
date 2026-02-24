import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, X } from 'lucide-react';

const DISMISS_KEY = 'home_screen_dismissed';
const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function isDismissedRecently(): boolean {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  return Date.now() - Number(dismissed) < DISMISS_DURATION_MS;
}

function isAddToHomeScreenAvailable(): boolean {
  try {
    return typeof (WebApp as any)?.addToHomeScreen === 'function' && WebApp.isVersionAtLeast('8.0');
  } catch {
    return false;
  }
}

export function HomeScreenPrompt() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const shownRef = useRef(false);

  useEffect(() => {
    if (shownRef.current) return;
    if (!isAddToHomeScreenAvailable() || isDismissedRecently()) return;

    const timer = setTimeout(() => {
      shownRef.current = true;
      setVisible(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleAdd = () => {
    try {
      (WebApp as any).addToHomeScreen();
    } catch {
      // silently fail — user will see the TG native dialog or nothing
    }
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="mx-4 mt-3"
        >
          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl p-4 border border-blue-500/20 relative">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 p-1 rounded-full text-telegram-hint hover:text-telegram-text transition-colors"
              aria-label={t('settings.homeScreenDismiss')}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-start gap-3 pr-6">
              <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm text-telegram-text">
                  {t('settings.homeScreen')}
                </h3>
                <p className="text-xs text-telegram-hint mt-0.5">
                  {t('settings.homeScreenDesc')}
                </p>
              </div>
            </div>

            <button
              onClick={handleAdd}
              className="mt-3 w-full py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
            >
              {t('settings.homeScreenAdd')}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
