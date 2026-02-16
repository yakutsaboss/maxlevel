import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import type { Achievement, UserAchievement } from '@/types/achievement';
import { logger } from '@/utils/logger';

interface UseAchievementsReturn {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  categories: string[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  checkForNew: () => Promise<Achievement[]>;
  getProgress: (achievement: Achievement) => { current: number; target: number; percentage: number };
}

interface UserContext {
  level?: number;
  xp?: number;
  currentStreak?: number;
  totalQuestsCompleted?: number;
  friendCount?: number;
}

export function useAchievements(userId: number | undefined, userContext?: UserContext): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [allRes, userRes] = await Promise.all([
        apiClient.getAchievements(),
        apiClient.getUserAchievements(userId),
      ]);
      if (!mountedRef.current) return;
      if (allRes.success && Array.isArray(allRes.data)) {
        setAchievements(allRes.data);
      }
      if (userRes.success && Array.isArray(userRes.data)) {
        setUserAchievements(userRes.data);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load achievements';
      setError(msg);
      logger.error('useAchievements loadData error', err as Record<string, unknown>);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  const checkForNew = useCallback(async (): Promise<Achievement[]> => {
    if (!userId) return [];
    try {
      const res = await apiClient.checkAchievements(userId);
      if (res.success && res.data?.newAchievements?.length) {
        await loadData();
        return res.data.newAchievements;
      }
      return [];
    } catch (err) {
      logger.error('useAchievements checkForNew error', err as Record<string, unknown>);
      return [];
    }
  }, [userId, loadData]);

  const getProgress = useCallback((achievement: Achievement): { current: number; target: number; percentage: number } => {
    const criteria = achievement.criteria;
    if (!criteria) return { current: 0, target: 1, percentage: 0 };

    const type = criteria.type as string | undefined;
    const threshold = (criteria.threshold as number) ?? (criteria.count as number) ?? 1;

    let current = 0;

    switch (type) {
      case 'quest_count':
      case 'quest_complete':
        current = userContext?.totalQuestsCompleted ?? 0;
        break;
      case 'streak':
        current = userContext?.currentStreak ?? 0;
        break;
      case 'level':
      case 'level_reached':
        current = userContext?.level ?? 0;
        break;
      case 'total_xp':
        current = userContext?.xp ?? 0;
        break;
      case 'friend_count':
        current = userContext?.friendCount ?? 0;
        break;
      default:
        return { current: 0, target: 1, percentage: 0 };
    }

    const clamped = Math.min(current, threshold);
    const percentage = threshold > 0 ? Math.round((clamped / threshold) * 100) : 0;
    return { current: clamped, target: threshold, percentage };
  }, [userContext]);

  const categories = achievements.length > 0
    ? [...new Set(achievements.map(a => a.category))].sort()
    : [];

  return {
    achievements,
    userAchievements,
    categories,
    loading,
    error,
    refresh,
    checkForNew,
    getProgress,
  };
}
