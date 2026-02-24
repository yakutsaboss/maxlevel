import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import WebApp from '@twa-dev/sdk';
import { motion } from 'framer-motion';
import { Smartphone, Plus, RotateCcw } from 'lucide-react';

const DISMISS_KEY = 'home_screen_dismissed';

function isAddToHomeScreenAvailable(): boolean {
  try {
    return typeof (WebApp as any)?.addToHomeScreen === 'function' && WebApp.isVersionAtLeast('8.0');
  } catch {
    return false;
  }
}

export function HomeScreenSettings() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(DISMISS_KEY));

  if (!isAddToHomeScreenAvailable()) return null;

  const handleAdd = () => {
    try {
      (WebApp as any).addToHomeScreen();
    } catch {
      // silently fail
    }
  };

  const handleReset = () => {
    localStorage.removeItem(DISMISS_KEY);
    setDismissed(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-blue-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
          <Smartphone className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{t('settings.homeScreen')}</h3>
          <p className="text-xs text-telegram-hint mt-0.5">{t('settings.homeScreenDesc')}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleAdd}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          {t('settings.homeScreenAdd')}
        </button>

        {dismissed && (
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-telegram-bg text-telegram-hint text-sm border border-telegram-hint/20 active:scale-[0.98] transition-transform"
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            {t('settings.homeScreenReset')}
          </button>
        )}
      </div>
    </motion.div>
  );
}
