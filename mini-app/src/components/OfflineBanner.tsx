import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useServiceWorker } from '@/hooks/useServiceWorker.js';

export function OfflineBanner() {
  const { isOffline } = useServiceWorker();
  const [showBackOnline, setShowBackOnline] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    if (isOffline) {
      wasOfflineRef.current = true;
      setShowBackOnline(false);
    } else if (wasOfflineRef.current) {
      // Just came back online
      wasOfflineRef.current = false;
      setShowBackOnline(true);
      const timer = setTimeout(() => setShowBackOnline(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOffline]);

  const handleCheckConnection = () => {
    // Trigger a lightweight fetch to verify connectivity
    fetch('/levelapp/', { method: 'HEAD', cache: 'no-store' }).catch(() => {});
  };

  const springTransition = { type: 'spring' as const, stiffness: 300, damping: 25 };

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          key="offline"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={springTransition}
          className="fixed top-0 left-0 right-0 z-50 bg-amber-500/95 backdrop-blur-sm px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-950" />
            <span className="text-xs font-medium text-amber-950">
              You're offline. Some features may be unavailable.
            </span>
            <button
              onClick={handleCheckConnection}
              className="ml-1 p-1 rounded-md hover:bg-amber-600/30 active:scale-95 transition-transform"
              aria-label="Check connection"
            >
              <RefreshCw className="w-3.5 h-3.5 text-amber-950" />
            </button>
          </div>
        </motion.div>
      )}
      {showBackOnline && (
        <motion.div
          key="back-online"
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={springTransition}
          className="fixed top-0 left-0 right-0 z-50 bg-emerald-500/95 backdrop-blur-sm px-4 py-2"
        >
          <div className="flex items-center justify-center gap-2">
            <Wifi className="w-4 h-4 text-emerald-950" />
            <span className="text-xs font-medium text-emerald-950">
              Back online!
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
