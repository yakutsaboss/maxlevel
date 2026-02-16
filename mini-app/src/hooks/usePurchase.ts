import { useState, useCallback, useRef } from 'react';
import { purchaseItem } from '@/api/shop.js';
import type { ShopItem, PaymentMethod, PurchaseResult } from '@/api/shop.js';
import { logger } from '@/utils/logger.js';

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
  onSuccess?: (result: PurchaseResult) => void;
  onError?: (error: string) => void;
}

/**
 * Hook managing the full purchase flow state machine:
 * idle → confirming → processing → success | error → idle
 */
export function usePurchase({ userId, onSuccess, onError }: UsePurchaseParams): UsePurchaseReturn {
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
      const purchaseResult = await purchaseItem(userId, currentItem.id, paymentMethod);
      setResult(purchaseResult);
      setPurchaseState('success');
      onSuccess?.(purchaseResult);
      logger.info('Purchase completed', {
        itemId: currentItem.id,
        paymentMethod,
        amountPaid: purchaseResult.purchase.amount_paid,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Purchase failed';
      setErrorMessage(message);
      setPurchaseState('error');
      onError?.(message);
      logger.error('Purchase failed', { error: err, itemId: currentItem.id, paymentMethod });
    } finally {
      processingRef.current = false;
    }
  }, [userId, currentItem, onSuccess, onError]);

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
