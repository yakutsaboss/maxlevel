import { useState, useCallback } from 'react';

const STORAGE_KEY = 'celebration-style';
type CelebrationStyle = 'emoji' | 'animated';

export function useCelebrationStyle() {
  const [style, setStyleState] = useState<CelebrationStyle>(
    () => (localStorage.getItem(STORAGE_KEY) as CelebrationStyle) || 'emoji'
  );

  const setStyle = useCallback((newStyle: CelebrationStyle) => {
    localStorage.setItem(STORAGE_KEY, newStyle);
    setStyleState(newStyle);
  }, []);

  return { style, setStyle, isAnimated: style === 'animated' };
}
