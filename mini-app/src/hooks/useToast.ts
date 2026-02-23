import { useState, useCallback, useRef } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  variant: 'success' | 'error' | 'info';
  duration: number;
  action?: { label: string; onClick: () => void };
}

const MAX_TOASTS = 3;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counterRef = useRef(0);

  const showToast = useCallback(
    (
      message: string,
      variant: ToastItem['variant'] = 'info',
      options?: { duration?: number; action?: ToastItem['action'] },
    ) => {
      const id = `toast-${++counterRef.current}-${Date.now()}`;
      const duration = options?.duration ?? 3000;

      setToasts((prev) => {
        const next = [...prev, { id, message, variant, duration, action: options?.action }];
        // Keep only the most recent MAX_TOASTS
        return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
      });

      return id;
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}
