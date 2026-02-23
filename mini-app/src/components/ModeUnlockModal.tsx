import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, Zap, Loader2 } from 'lucide-react';
import { FocusTrap } from '@/components/FocusTrap';
import { MODE_PRICES } from '@/hooks/useModeUnlock';

interface ModeUnlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  modeName: string;
  modeIcon: string;
  modeDisplayName: string;
  userXP: number;
  isUnlocking: boolean;
  error: string | null;
  onUnlockWithStars: () => void;
  onUnlockWithXP: () => void;
}

export function ModeUnlockModal({
  isOpen,
  onClose,
  modeName,
  modeIcon,
  modeDisplayName,
  userXP,
  isUnlocking,
  error,
  onUnlockWithStars,
  onUnlockWithXP,
}: ModeUnlockModalProps) {
  const { t } = useTranslation();
  const prices = MODE_PRICES[modeName];
  const canAffordXP = prices ? userXP >= prices.xp : false;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!prices) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <FocusTrap active onEscape={onClose} aria-label={modeDisplayName}>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onClose}
            />

            {/* Modal */}
            <motion.div
              className="relative w-full max-w-sm bg-telegram-bg rounded-3xl shadow-2xl border border-telegram-hint/10 overflow-hidden"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-telegram-secondaryBg text-telegram-hint hover:text-telegram-text transition-colors"
                aria-label={t('common.close')}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header with gradient */}
              <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 pt-8 pb-6 px-6 text-center">
                <motion.div
                  className="text-6xl mb-3"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                >
                  {modeIcon}
                </motion.div>
                <h2 className="text-xl font-bold text-telegram-text">
                  {modeDisplayName}
                </h2>
                <p className="text-sm text-telegram-hint mt-1">
                  {t('modeUnlock.description')}
                </p>
              </div>

              {/* Unlock options */}
              <div className="p-6 space-y-3">
                {/* Stars option */}
                <button
                  onClick={onUnlockWithStars}
                  disabled={isUnlocking}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/30 hover:border-yellow-500/50 transition-all active:scale-[0.98] disabled:opacity-60"
                >
                  <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    {isUnlocking ? (
                      <Loader2 className="w-6 h-6 text-yellow-500 animate-spin" />
                    ) : (
                      <Star className="w-6 h-6 text-yellow-500" />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className="font-semibold text-telegram-text">
                      {t('modeUnlock.unlockWithStars', { amount: prices.stars })}
                    </div>
                    <div className="text-xs text-telegram-hint mt-0.5">
                      {t('modeUnlock.starsHint')}
                    </div>
                  </div>
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 px-2">
                  <div className="flex-1 h-px bg-telegram-hint/15" />
                  <span className="text-xs text-telegram-hint font-medium">{t('modeUnlock.or')}</span>
                  <div className="flex-1 h-px bg-telegram-hint/15" />
                </div>

                {/* XP option */}
                <button
                  onClick={onUnlockWithXP}
                  disabled={isUnlocking || !canAffordXP}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.98] disabled:opacity-60 ${
                    canAffordXP
                      ? 'bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 hover:border-purple-500/50'
                      : 'bg-telegram-secondaryBg border-telegram-hint/15'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    canAffordXP ? 'bg-purple-500/20' : 'bg-telegram-hint/10'
                  }`}>
                    {isUnlocking ? (
                      <Loader2 className={`w-6 h-6 animate-spin ${canAffordXP ? 'text-purple-500' : 'text-telegram-hint'}`} />
                    ) : (
                      <Zap className={`w-6 h-6 ${canAffordXP ? 'text-purple-500' : 'text-telegram-hint'}`} />
                    )}
                  </div>
                  <div className="text-left flex-1 min-w-0">
                    <div className={`font-semibold ${canAffordXP ? 'text-telegram-text' : 'text-telegram-hint'}`}>
                      {t('modeUnlock.unlockWithXP', { amount: prices.xp })}
                    </div>
                    <div className="text-xs text-telegram-hint mt-0.5">
                      {canAffordXP
                        ? t('modeUnlock.xpReady')
                        : t('modeUnlock.xpNotEnough', { current: userXP, needed: prices.xp })}
                    </div>
                  </div>
                </button>

                {/* Error */}
                {error && (
                  <motion.p
                    className="text-xs text-red-400 text-center px-2"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {error}
                  </motion.p>
                )}
              </div>
            </motion.div>
          </motion.div>
        </FocusTrap>
      )}
    </AnimatePresence>
  );
}
