import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import type { ToastItem } from '@/hooks/useToast';

const VARIANT_STYLES = {
  success: {
    bg: 'bg-green-500',
    icon: CheckCircle,
  },
  error: {
    bg: 'bg-red-500',
    icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-500',
    icon: Info,
  },
};

function ToastItemComponent({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  useEffect(() => {
    const timer = setTimeout(dismiss, toast.duration);
    return () => clearTimeout(timer);
  }, [dismiss, toast.duration]);

  const style = VARIANT_STYLES[toast.variant];
  const Icon = style.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`${style.bg} rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="w-5 h-5 text-white flex-shrink-0" aria-hidden="true" />
      <span className="text-white text-sm font-medium flex-1">{toast.message}</span>
      {toast.action && (
        <button
          onClick={() => {
            toast.action!.onClick();
            dismiss();
          }}
          className="px-2.5 py-1 bg-white/20 rounded-lg text-white text-xs font-bold active:scale-95 transition-transform"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={dismiss}
        className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition-transform"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4 text-white" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItemComponent toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
