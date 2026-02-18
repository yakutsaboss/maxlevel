import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff } from 'lucide-react';
import { useServiceWorker } from '@/hooks/useServiceWorker.js';

export function OfflineBanner() {
  const { isOffline } = useServiceWorker();

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 backdrop-blur-sm px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-950" />
            <span className="text-xs font-medium text-amber-950">
              You're offline. Some features may be unavailable.
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
