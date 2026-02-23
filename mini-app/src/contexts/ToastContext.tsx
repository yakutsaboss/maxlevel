import { createContext, useContext } from 'react';
import { useToast, type ToastItem } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ToastContainer';

interface ToastContextValue {
  showToast: (
    message: string,
    variant?: ToastItem['variant'],
    options?: { duration?: number; action?: ToastItem['action'] },
  ) => string;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { toasts, showToast, dismissToast } = useToast();

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToastContext must be used within ToastProvider');
  return ctx;
}
