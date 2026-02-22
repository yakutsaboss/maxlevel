import { useState, useCallback, useEffect, useRef } from 'react';
import WebApp from '@twa-dev/sdk';
import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

/** Free modes that never require unlocking */
const FREE_MODES = ['fitness', 'hydration', 'habits'];

/** Pricing config for paid modes */
export const MODE_PRICES: Record<string, { stars: number; xp: number }> = {
  medication: { stars: 300, xp: 10_000 },
};

type InvoiceStatus = 'paid' | 'cancelled' | 'failed' | 'pending';

interface UseModeUnlockReturn {
  /** List of mode names the user has unlocked (paid modes only) */
  unlockedModes: string[];
  /** Whether the hook is currently loading unlocked modes */
  loading: boolean;
  /** Whether an unlock operation is in progress */
  isUnlocking: boolean;
  /** Error from the last operation */
  error: string | null;
  /** User's current total XP (fetched alongside unlocks) */
  userXP: number;
  /** Check if a mode is available (free or unlocked) */
  isModeAvailable: (modeName: string) => boolean;
  /** Unlock a mode via Telegram Stars payment */
  unlockWithStars: (modeName: string) => Promise<boolean>;
  /** Unlock a mode by spending XP */
  unlockWithXP: (modeName: string) => Promise<boolean>;
  /** Re-fetch unlocked modes */
  refresh: () => Promise<void>;
}

interface UseModeUnlockParams {
  userId: number | undefined;
  onUnlocked?: (modeName: string, method: 'stars' | 'xp') => void;
}

export function useModeUnlock({ userId, onUnlocked }: UseModeUnlockParams): UseModeUnlockReturn {
  const [unlockedModes, setUnlockedModes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userXP, setUserXP] = useState(0);
  const unlockingRef = useRef(false);

  const fetchUnlocks = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/modes/unlocks/${userId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        // If endpoint doesn't exist yet (Agent E hasn't deployed), gracefully degrade
        if (res.status === 404) {
          setUnlockedModes([]);
          setLoading(false);
          return;
        }
        throw new Error(`Failed to fetch unlocks (${res.status})`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setUnlockedModes(json.data.unlocked_modes || []);
        if (json.data.total_xp !== undefined) {
          setUserXP(json.data.total_xp);
        }
      }
    } catch (err) {
      logger.error('Failed to fetch mode unlocks', { error: err, userId });
      // Don't set error state for fetch — gracefully degrade to showing all modes as locked
      setUnlockedModes([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnlocks();
  }, [fetchUnlocks]);

  const isModeAvailable = useCallback(
    (modeName: string) => {
      if (FREE_MODES.includes(modeName)) return true;
      return unlockedModes.includes(modeName);
    },
    [unlockedModes],
  );

  const unlockWithStars = useCallback(
    async (modeName: string): Promise<boolean> => {
      if (!userId || unlockingRef.current) return false;

      const price = MODE_PRICES[modeName];
      if (!price) {
        setError(`Unknown paid mode: ${modeName}`);
        return false;
      }

      unlockingRef.current = true;
      setIsUnlocking(true);
      setError(null);

      try {
        // Step 1: Call backend to create payment for mode unlock
        const res = await fetch(`${API_BASE_URL}/modes/unlock`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId,
            modeName,
            method: 'stars',
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Unlock failed (${res.status})`);
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Unlock failed');
        }

        const { invoice_url } = json.data;

        // Step 2: Open Telegram Stars invoice
        const paid = await new Promise<boolean>((resolve) => {
          try {
            WebApp.openInvoice(invoice_url, (status: InvoiceStatus) => {
              logger.info('Mode unlock invoice callback', { status, modeName });
              resolve(status === 'paid');
            });
          } catch (err) {
            logger.error('Failed to open invoice', { error: err });
            resolve(false);
          }
        });

        if (!paid) {
          setError('Payment cancelled');
          return false;
        }

        // Step 3: Refresh unlocked modes to confirm
        await fetchUnlocks();
        onUnlocked?.(modeName, 'stars');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Payment failed';
        setError(message);
        logger.error('Stars unlock error', { error: err, userId, modeName });
        return false;
      } finally {
        setIsUnlocking(false);
        unlockingRef.current = false;
      }
    },
    [userId, fetchUnlocks, onUnlocked],
  );

  const unlockWithXP = useCallback(
    async (modeName: string): Promise<boolean> => {
      if (!userId || unlockingRef.current) return false;

      const price = MODE_PRICES[modeName];
      if (!price) {
        setError(`Unknown paid mode: ${modeName}`);
        return false;
      }

      if (userXP < price.xp) {
        setError(`Not enough XP (need ${price.xp}, have ${userXP})`);
        return false;
      }

      unlockingRef.current = true;
      setIsUnlocking(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE_URL}/modes/unlock`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            userId,
            modeName,
            method: 'xp',
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Unlock failed (${res.status})`);
        }

        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Unlock failed');
        }

        // Update local XP
        if (json.data.remaining_xp !== undefined) {
          setUserXP(json.data.remaining_xp);
        }

        // Refresh unlocked modes
        await fetchUnlocks();
        onUnlocked?.(modeName, 'xp');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'XP unlock failed';
        setError(message);
        logger.error('XP unlock error', { error: err, userId, modeName });
        return false;
      } finally {
        setIsUnlocking(false);
        unlockingRef.current = false;
      }
    },
    [userId, userXP, fetchUnlocks, onUnlocked],
  );

  return {
    unlockedModes,
    loading,
    isUnlocking,
    error,
    userXP,
    isModeAvailable,
    unlockWithStars,
    unlockWithXP,
    refresh: fetchUnlocks,
  };
}
