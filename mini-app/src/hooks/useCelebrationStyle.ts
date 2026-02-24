import { useState, useCallback, useEffect } from 'react';
import { useCloudStorage } from './useCloudStorage';

const STORAGE_KEY = 'celebration-style';
type CelebrationStyle = 'emoji' | 'animated';

export function useCelebrationStyle() {
  const cloudStorage = useCloudStorage();
  const [style, setStyleState] = useState<CelebrationStyle>(
    () => (localStorage.getItem(STORAGE_KEY) as CelebrationStyle) || 'emoji'
  );

  // On init: try CloudStorage first, fallback to localStorage
  useEffect(() => {
    if (!cloudStorage.isAvailable) return;
    cloudStorage.getItem(STORAGE_KEY).then((val) => {
      if (val && (val === 'emoji' || val === 'animated')) {
        // CloudStorage has a value — update if different from localStorage
        if (val !== localStorage.getItem(STORAGE_KEY)) {
          localStorage.setItem(STORAGE_KEY, val);
          setStyleState(val);
        }
      }
    }).catch(() => { /* CloudStorage read failed, keep localStorage value */ });
  }, []);

  const setStyle = useCallback((newStyle: CelebrationStyle) => {
    localStorage.setItem(STORAGE_KEY, newStyle);
    setStyleState(newStyle);
    // Async sync to CloudStorage (fire-and-forget)
    cloudStorage.setItem(STORAGE_KEY, newStyle).catch(() => {});
  }, [cloudStorage]);

  return { style, setStyle, isAnimated: style === 'animated' };
}
