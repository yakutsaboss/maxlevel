import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram.js';

const DISMISS_KEY = 'install_prompt_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const { haptic } = useTelegram();

  useEffect(() => {
    // Check if dismissed recently
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed && Date.now() - Number(dismissed) < DISMISS_DURATION_MS) {
        return;
      }
    } catch { /* noop */ }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    haptic.impact('medium');
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      haptic.notification('success');
    }
    setDeferredPrompt(null);
    setVisible(false);
  }, [deferredPrompt, haptic]);

  const handleDismiss = useCallback(() => {
    haptic.impact('light');
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* noop */ }
    setVisible(false);
  }, [haptic]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed bottom-20 left-3 right-3 z-50 bg-slate-800/95 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-lg border border-slate-700/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Download className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200">Add MaxLevel to your home screen</p>
            </div>
            <button
              onClick={handleInstall}
              className="flex-shrink-0 bg-indigo-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
            >
              Install
            </button>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-full hover:bg-slate-700/50 active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
