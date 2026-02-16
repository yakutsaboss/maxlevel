import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchAllTrophies, fetchUserTrophies, checkTrophies } from '@/api/trophies';
import type { Trophy, UserTrophy } from '@/api/trophies';
import { logger } from '@/utils/logger';

interface UseTrophiesReturn {
  allTrophies: Trophy[];
  earnedTrophies: UserTrophy[];
  loading: boolean;
  error: string | null;
  checkForNew: () => Promise<UserTrophy[]>;
  refresh: () => void;
}

export function useTrophies(userId: number | undefined): UseTrophiesReturn {
  const [allTrophies, setAllTrophies] = useState<Trophy[]>([]);
  const [earnedTrophies, setEarnedTrophies] = useState<UserTrophy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const checkedRef = useRef(false);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [all, earned] = await Promise.all([
        fetchAllTrophies(),
        fetchUserTrophies(userId),
      ]);
      if (!mountedRef.current) return;
      setAllTrophies(Array.isArray(all) ? all : []);
      setEarnedTrophies(Array.isArray(earned) ? earned : []);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load trophies';
      setError(msg);
      logger.error('useTrophies loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  const checkForNew = useCallback(async (): Promise<UserTrophy[]> => {
    if (!userId) return [];
    try {
      const result = await checkTrophies(userId);
      if (result?.newTrophies?.length) {
        await loadData();
        return result.newTrophies;
      }
      return [];
    } catch (err) {
      logger.error('useTrophies checkForNew error', { error: err });
      return [];
    }
  }, [userId, loadData]);

  useEffect(() => {
    mountedRef.current = true;
    checkedRef.current = false;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  // Auto-check for new trophies once after initial load
  useEffect(() => {
    if (!loading && !error && userId && !checkedRef.current) {
      checkedRef.current = true;
      checkForNew();
    }
  }, [loading, error, userId, checkForNew]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    allTrophies,
    earnedTrophies,
    loading,
    error,
    checkForNew,
    refresh,
  };
}
