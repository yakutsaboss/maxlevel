import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

interface ToastProps {
  message: string;
  variant: 'success' | 'error' | 'info';
  onDismiss: () => void;
}

const VARIANT_STYLES = {
  success: {
    bg: 'bg-green-500',
    icon: <CheckCircle className="w-5 h-5 text-white" />,
  },
  error: {
    bg: 'bg-red-500',
    icon: <AlertCircle className="w-5 h-5 text-white" />,
  },
  info: {
    bg: 'bg-blue-500',
    icon: <Info className="w-5 h-5 text-white" />,
  },
};

export function Toast({ message, variant, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const style = VARIANT_STYLES[variant];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -60 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={`fixed top-4 left-4 right-4 z-[100] ${style.bg} rounded-2xl px-4 py-3 shadow-lg flex items-center gap-3`}
      >
        {style.icon}
        <span className="text-white text-sm font-medium flex-1">{message}</span>
        <button onClick={onDismiss} className="p-1 rounded-full hover:bg-white/20 active:scale-90 transition-transform">
          <X className="w-4 h-4 text-white" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
