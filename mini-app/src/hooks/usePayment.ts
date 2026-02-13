import { useState, useCallback, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { createPayment, getPaymentStatus } from '@/api/payments';
import type { PaymentStatusResponse } from '@/api/payments';
import { logger } from '@/utils/logger';

type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

interface UsePaymentReturn {
  /** Initiate the Stars payment flow for a given tier + amount */
  initiatePayment: (tier: string, amount: number) => Promise<void>;
  /** True while payment is being processed */
  isLoading: boolean;
  /** Error message if payment failed */
  error: string | null;
  /** Result after successful payment */
  paymentResult: PaymentStatusResponse | null;
}

interface UsePaymentParams {
  userId: number | undefined;
  /** Called after a successful payment */
  onSuccess?: (result: PaymentStatusResponse) => void;
  /** Called when payment fails or is cancelled */
  onError?: (error: string) => void;
}

/**
 * Hook managing the Telegram Stars payment flow:
 * 1. Call backend to create a pending payment
 * 2. Open Telegram Stars invoice via WebApp.openInvoice()
 * 3. Handle callback status (paid/cancelled/failed)
 * 4. On success, poll subscription status to confirm tier upgrade
 */
export function usePayment({ userId, onSuccess, onError }: UsePaymentParams): UsePaymentReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentStatusResponse | null>(null);
  const loadingRef = useRef(false);

  const initiatePayment = useCallback(async (tier: string, amount: number) => {
    if (!userId || loadingRef.current) return;

    loadingRef.current = true;
    setIsLoading(true);
    setError(null);
    setPaymentResult(null);

    try {
      // Step 1: Create pending payment on backend
      const payment = await createPayment(userId, tier, amount);
      logger.info('Payment created', { paymentId: payment.payment_id, tier, amount });

      // Step 2: Open Telegram Stars invoice
      // WebApp.openInvoice expects the invoice URL and a callback
      // For Telegram Stars, we use the Bot API createInvoiceLink or a direct stars:// URL
      // The backend returns payment_id — we construct the invoice slug
      const invoiceUrl = `https://t.me/$${import.meta.env.VITE_BOT_USERNAME || 'yakutsa_bot'}?startattach=pay_${payment.payment_id}`;

      await new Promise<void>((resolve, reject) => {
        try {
          WebApp.openInvoice(invoiceUrl, (status: InvoiceStatus) => {
            logger.info('Invoice callback', { status, paymentId: payment.payment_id });

            if (status === 'paid') {
              resolve();
            } else if (status === 'cancelled') {
              reject(new Error('Payment cancelled'));
            } else if (status === 'failed') {
              reject(new Error('Payment failed'));
            } else {
              // pending — treat as in-progress, resolve and poll
              resolve();
            }
          });
        } catch (err) {
          // openInvoice may throw if not in Telegram context
          reject(err);
        }
      });

      // Step 3: Poll subscription status to confirm upgrade
      let attempts = 0;
      const maxAttempts = 5;
      let statusData: PaymentStatusResponse | null = null;

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 1500));
        attempts++;

        try {
          statusData = await getPaymentStatus(userId);
          if (statusData.tier === tier && statusData.is_active) {
            break;
          }
        } catch {
          // Polling error — continue trying
        }
      }

      if (statusData) {
        setPaymentResult(statusData);
        onSuccess?.(statusData);
        logger.info('Payment confirmed', { tier: statusData.tier, isActive: statusData.is_active });
      } else {
        // Could not confirm but payment may still process
        const fallback = await getPaymentStatus(userId).catch(() => null);
        if (fallback) {
          setPaymentResult(fallback);
          onSuccess?.(fallback);
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onError?.(message);
      logger.error('Payment flow error', { error: err, userId });
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [userId, onSuccess, onError]);

  return { initiatePayment, isLoading, error, paymentResult };
}
