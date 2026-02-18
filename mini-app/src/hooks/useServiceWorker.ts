import { useState, useEffect, useCallback, useRef } from 'react';

interface UseServiceWorkerReturn {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  updateServiceWorker: () => void;
}

export function useServiceWorker(): UseServiceWorkerReturn {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const waitingWorkerRef = useRef<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const onStateChange = (worker: ServiceWorker) => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        waitingWorkerRef.current = worker;
        setIsUpdateAvailable(true);
      }
    };

    const onControllerChange = () => {
      window.location.reload();
    };

    navigator.serviceWorker
      .register('/levelapp/sw.js')
      .then((reg) => {
        // Check if there's already a waiting worker
        if (reg.waiting) {
          waitingWorkerRef.current = reg.waiting;
          setIsUpdateAvailable(true);
        }

        // Listen for new installing workers
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => onStateChange(installing));
        });
      })
      .catch(() => {
        // SW registration failed — likely unsupported environment
      });

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  // Online/offline tracking
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const updateServiceWorker = useCallback(() => {
    const worker = waitingWorkerRef.current;
    if (worker) {
      worker.postMessage({ type: 'SKIP_WAITING' });
    }
  }, []);

  return { isUpdateAvailable, isOffline, updateServiceWorker };
}
