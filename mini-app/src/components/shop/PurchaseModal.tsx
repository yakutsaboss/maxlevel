import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { X, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { FocusTrap } from '@/components/FocusTrap';
import type { ShopItem, PaymentMethod } from '@/api/shop.js';
import type { PurchaseState } from '@/hooks/usePurchase.js';

const RARITY_GRADIENT: Record<string, string> = {
  common: 'from-gray-400 to-gray-500',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-amber-500',
};

interface PurchaseModalProps {
  item: ShopItem | null;
  purchaseState: PurchaseState;
  errorMessage: string | null;
  onConfirm: (paymentMethod: PaymentMethod) => void;
  onClose: () => void;
}

export function PurchaseModal({
  item,
  purchaseState,
  errorMessage,
  onConfirm,
  onClose,
}: PurchaseModalProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);

  const isOpen = !!item && (purchaseState === 'confirming' || purchaseState === 'processing' || purchaseState === 'error');
  const isProcessing = purchaseState === 'processing';
  const isError = purchaseState === 'error';

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    if (!isProcessing && (info.offset.y > 100 || info.velocity.y > 500)) {
      onClose();
    }
  }, [onClose, isProcessing]);

  if (!item || !isOpen) return null;

  const gradient = RARITY_GRADIENT[item.rarity] ?? RARITY_GRADIENT.common;
  const hasStarsPrice = item.price_stars > 0;
  const hasXpPrice = item.price_xp > 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end"
        onClick={isProcessing ? undefined : onClose}
      >
        <FocusTrap onEscape={isProcessing ? undefined : onClose}>
        <motion.div
          ref={sheetRef}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          drag={isProcessing ? false : 'y'}
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
          className="bg-telegram-secondaryBg rounded-t-3xl w-full max-h-[85vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mt-3 mb-2" />

          {/* Close button */}
          <div className="flex justify-end px-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-2 rounded-full bg-telegram-hint/10 active:bg-telegram-hint/20 disabled:opacity-40"
              aria-label={t('shop.close')}
            >
              <X className="w-5 h-5 text-telegram-hint" />
            </button>
          </div>

          {/* Item icon hero */}
          <div className={`mx-6 mt-2 mb-4 rounded-2xl bg-gradient-to-br ${gradient} p-8 flex items-center justify-center`}>
            <span className="text-7xl" role="img" aria-label={item.name}>
              {item.icon_emoji || '🛍️'}
            </span>
          </div>

          {/* Item info */}
          <div className="px-6 pb-8">
            <h2 className="text-xl font-bold mb-1">{item.name}</h2>

            {/* Rarity badge */}
            <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full capitalize mb-3 bg-gradient-to-r ${gradient} text-white`}>
              {t(`shop.rarity_${item.rarity}`)}
            </span>

            {/* Description */}
            {item.description && (
              <p className="text-sm text-telegram-hint mb-5">{item.description}</p>
            )}

            {/* Error state */}
            {isError && errorMessage && (
              <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-4 py-3 mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Processing state */}
            {isProcessing && (
              <div className="flex items-center justify-center gap-3 py-4 mb-4">
                <Loader2 className="w-5 h-5 animate-spin text-telegram-link" />
                <span className="text-sm font-medium text-telegram-hint">{t('shop.processing')}</span>
              </div>
            )}

            {/* Payment buttons */}
            {!isProcessing && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-telegram-hint mb-2">
                  {t('shop.confirmPurchase')}
                </p>

                {hasStarsPrice && (
                  <button
                    onClick={() => onConfirm('stars')}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {isError ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        {t('shop.retryWithStars', { amount: item.price_stars })}
                      </>
                    ) : (
                      t('shop.payWithStars', { amount: item.price_stars })
                    )}
                  </button>
                )}

                {hasXpPrice && (
                  <button
                    onClick={() => onConfirm('xp')}
                    disabled={isProcessing}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                  >
                    {isError ? (
                      <>
                        <RotateCcw className="w-4 h-4" />
                        {t('shop.retryWithXp', { amount: item.price_xp })}
                      </>
                    ) : (
                      t('shop.payWithXp', { amount: item.price_xp })
                    )}
                  </button>
                )}

                {/* Cancel */}
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl bg-telegram-hint/10 text-telegram-hint font-medium text-base active:bg-telegram-hint/20 transition-colors"
                >
                  {t('shop.cancel')}
                </button>
              </div>
            )}
          </div>
        </motion.div>
        </FocusTrap>
      </motion.div>
    </AnimatePresence>
  );
}
