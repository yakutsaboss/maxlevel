import { useState, useCallback, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { purchaseItem, createShopInvoice } from '@/api/shop.js';
import type { ShopItem, PaymentMethod, PurchaseResult } from '@/api/shop.js';
import { logger } from '@/utils/logger.js';

type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

export type PurchaseState = 'idle' | 'confirming' | 'processing' | 'success' | 'error';

interface UsePurchaseReturn {
  /** Current state of the purchase flow */
  purchaseState: PurchaseState;
  /** The item being considered / purchased */
  currentItem: ShopItem | null;
  /** The result after a successful purchase */
  result: PurchaseResult | null;
  /** Error message when state === 'error' */
  errorMessage: string | null;
  /** Open the confirmation modal for an item */
  startPurchase: (item: ShopItem) => void;
  /** Confirm the purchase with a chosen payment method */
  confirmPurchase: (paymentMethod: PaymentMethod) => Promise<void>;
  /** Dismiss the success / error result and reset to idle */
  dismissResult: () => void;
  /** Cancel without purchasing (from confirming state) */
  cancelPurchase: () => void;
}

interface UsePurchaseParams {
  userId: number | undefined;
  telegramId: number | undefined;
  onSuccess?: (result: PurchaseResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook managing the full purchase flow state machine:
 * idle → confirming → processing → success | error → idle
 */
export function usePurchase({ userId, telegramId, onSuccess, onError }: UsePurchaseParams): UsePurchaseReturn {
  const [purchaseState, setPurchaseState] = useState<PurchaseState>('idle');
  const [currentItem, setCurrentItem] = useState<ShopItem | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processingRef = useRef(false);

  const startPurchase = useCallback((item: ShopItem) => {
    setCurrentItem(item);
    setResult(null);
    setErrorMessage(null);
    setPurchaseState('confirming');
    logger.info('Purchase flow started', { itemId: item.id, itemName: item.name });
  }, []);

  const confirmPurchase = useCallback(async (paymentMethod: PaymentMethod) => {
    if (!userId || !currentItem || processingRef.current) return;

    processingRef.current = true;
    setPurchaseState('processing');
    setErrorMessage(null);

    try {
      if (paymentMethod === 'stars') {
        // Stars: create invoice → open Telegram payment → handle callback
        if (!telegramId) throw new Error('Telegram ID required for Stars payment');

        const invoice = await createShopInvoice(telegramId, currentItem.id);
        logger.info('Shop invoice created', { paymentId: invoice.payment_id, itemId: currentItem.id });

        await new Promise<void>((resolve, reject) => {
          try {
            WebApp.openInvoice(invoice.invoice_url, (status: InvoiceStatus) => {
              logger.info('Shop invoice callback', { status, paymentId: invoice.payment_id });

              if (status === 'paid') {
                resolve();
              } else if (status === 'cancelled') {
                reject(new Error('Payment cancelled'));
              } else if (status === 'failed') {
                reject(new Error('Payment failed'));
              } else {
                // pending — treat as paid (backend confirms via pre_checkout/successful_payment)
                resolve();
              }
            });
          } catch (err) {
            reject(err);
          }
        });

        // Payment succeeded — set success state
        // The backend handles item delivery via successful_payment handler
        setPurchaseState('success');
        onSuccess?.({
          purchase: {
            id: invoice.payment_id,
            user_id: userId,
            shop_item_id: currentItem.id,
            payment_method: 'stars',
            amount_paid: currentItem.price_stars,
            purchased_at: new Date().toISOString(),
          },
          newBalance: {},
        });
        logger.info('Stars purchase completed', {
          itemId: currentItem.id,
          paymentId: invoice.payment_id,
        });
      } else {
        // XP: direct atomic deduction via existing endpoint
        const purchaseResult = await purchaseItem(userId, currentItem.id, paymentMethod);
        setResult(purchaseResult);
        setPurchaseState('success');
        onSuccess?.(purchaseResult);
        logger.info('Purchase completed', {
          itemId: currentItem.id,
          paymentMethod,
          amountPaid: purchaseResult.purchase.amount_paid,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setErrorMessage(message);
      setPurchaseState('error');
      onError?.(message);
      logger.error('Purchase failed', { error: err, itemId: currentItem.id, paymentMethod });
    } finally {
      processingRef.current = false;
    }
  }, [userId, telegramId, currentItem, onSuccess, onError]);

  const dismissResult = useCallback(() => {
    setPurchaseState('idle');
    setCurrentItem(null);
    setResult(null);
    setErrorMessage(null);
  }, []);

  const cancelPurchase = useCallback(() => {
    setPurchaseState('idle');
    setCurrentItem(null);
    setErrorMessage(null);
    logger.info('Purchase cancelled', { itemId: currentItem?.id });
  }, [currentItem]);

  return {
    purchaseState,
    currentItem,
    result,
    errorMessage,
    startPurchase,
    confirmPurchase,
    dismissResult,
    cancelPurchase,
  };
}
