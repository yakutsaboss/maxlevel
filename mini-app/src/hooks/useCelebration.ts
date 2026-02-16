import { useState, useCallback, useEffect, useRef } from 'react';
import type { Achievement } from '@/types/achievement';

const STORAGE_KEY_LEVEL = 'celebration_last_level';
const STORAGE_KEY_XP = 'celebration_last_xp';

function getStoredNumber(key: string): number | null {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function storeNumber(key: string, value: number): void {
  try {
    localStorage.setItem(key, String(value));
  } catch { /* noop */ }
}

interface CelebrationState {
  showConfetti: boolean;
  showLevelUp: boolean;
  showXpFloat: boolean;
  levelUpData: number;
  xpGained: number;
}

export function useCelebration() {
  const [state, setState] = useState<CelebrationState>({
    showConfetti: false,
    showLevelUp: false,
    showXpFloat: false,
    levelUpData: 0,
    xpGained: 0,
  });

  const [achievementUnlocked, setAchievementUnlocked] = useState<Achievement | null>(null);

  const initializedRef = useRef(false);

  const onDashboardData = useCallback((level: number, xp: number) => {
    // First call — just store baseline, don't celebrate
    if (!initializedRef.current) {
      const storedLevel = getStoredNumber(STORAGE_KEY_LEVEL);
      const storedXp = getStoredNumber(STORAGE_KEY_XP);

      if (storedLevel === null || storedXp === null) {
        storeNumber(STORAGE_KEY_LEVEL, level);
        storeNumber(STORAGE_KEY_XP, xp);
        initializedRef.current = true;
        return;
      }

      initializedRef.current = true;

      // Compare with stored values
      if (level > storedLevel) {
        setState({
          showConfetti: true,
          showLevelUp: true,
          showXpFloat: false,
          levelUpData: level,
          xpGained: 0,
        });
        storeNumber(STORAGE_KEY_LEVEL, level);
        storeNumber(STORAGE_KEY_XP, xp);
        return;
      }

      if (xp > storedXp) {
        setState((prev) => ({
          ...prev,
          showXpFloat: true,
          xpGained: xp - storedXp,
        }));
        storeNumber(STORAGE_KEY_XP, xp);
        return;
      }

      storeNumber(STORAGE_KEY_LEVEL, level);
      storeNumber(STORAGE_KEY_XP, xp);
      return;
    }

    // Subsequent calls — compare with last stored values
    const prevLevel = getStoredNumber(STORAGE_KEY_LEVEL) ?? level;
    const prevXp = getStoredNumber(STORAGE_KEY_XP) ?? xp;

    if (level > prevLevel) {
      setState({
        showConfetti: true,
        showLevelUp: true,
        showXpFloat: false,
        levelUpData: level,
        xpGained: 0,
      });
    } else if (xp > prevXp) {
      setState((prev) => ({
        ...prev,
        showXpFloat: true,
        xpGained: xp - prevXp,
      }));
    }

    storeNumber(STORAGE_KEY_LEVEL, level);
    storeNumber(STORAGE_KEY_XP, xp);
  }, []);

  const dismiss = useCallback(() => {
    setState({
      showConfetti: false,
      showLevelUp: false,
      showXpFloat: false,
      levelUpData: 0,
      xpGained: 0,
    });
  }, []);

  const dismissConfetti = useCallback(() => {
    setState((prev) => ({ ...prev, showConfetti: false }));
  }, []);

  const dismissLevelUp = useCallback(() => {
    setState((prev) => ({ ...prev, showLevelUp: false }));
  }, []);

  const dismissXpFloat = useCallback(() => {
    setState((prev) => ({ ...prev, showXpFloat: false }));
  }, []);

  const onAchievementUnlocked = useCallback((achievement: Achievement) => {
    setAchievementUnlocked(achievement);
    const rarity = achievement.rarity?.toLowerCase();
    if (rarity === 'epic' || rarity === 'legendary') {
      setState((prev) => ({ ...prev, showConfetti: true }));
    }
  }, []);

  const dismissAchievement = useCallback(() => {
    setAchievementUnlocked(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      initializedRef.current = false;
    };
  }, []);

  return {
    showConfetti: state.showConfetti,
    showLevelUp: state.showLevelUp,
    showXpFloat: state.showXpFloat,
    levelUpData: state.levelUpData,
    xpGained: state.xpGained,
    achievementUnlocked,
    onDashboardData,
    onAchievementUnlocked,
    dismiss,
    dismissAchievement,
    dismissConfetti,
    dismissLevelUp,
    dismissXpFloat,
  };
}
