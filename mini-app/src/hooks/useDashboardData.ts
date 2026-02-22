import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useDashboardStats, dashboardKeys } from './useDashboardQuery';
import { apiClient } from '@/api/client';
import { Achievement, UserStats } from '@/types';
import type { HapticWithNotification } from '@/types/telegram';
import { logger } from '@/utils/logger';

interface UseDashboardDataParams {
  userId: number | undefined;
  haptic: HapticWithNotification;
  onDashboardData?: (level: number, xp: number) => void;
}

export function useDashboardData({ userId, haptic, onDashboardData }: UseDashboardDataParams) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);
  const onDashboardDataRef = useRef(onDashboardData);
  onDashboardDataRef.current = onDashboardData;

  // React Query hook — replaces manual useState + fetch + AbortController
  const { data: stats, isLoading: loading, isError: error } = useDashboardStats(userId);

  // Notify celebration system when dashboard data arrives or updates
  useEffect(() => {
    if (stats) {
      onDashboardDataRef.current?.(stats.user.level, stats.user.xp);
    }
  }, [stats]);

  const checkForNewAchievements = useCallback(async (dbUserId: number) => {
    try {
      const res = await apiClient.checkAchievements(dbUserId);
      if (res.success && res.data && res.data.newAchievements && res.data.newAchievements.length > 0) {
        const ach = res.data.newAchievements[0];
        setToastAchievement({
          id: ach.id,
          name: ach.name,
          description: ach.description,
          icon: ach.badge_icon || ach.icon || '🏆',
          xp_reward: ach.xp_bonus || ach.xp_reward || 0,
          rarity: ach.rarity || 'common',
          category: ach.category || 'general',
        });
        haptic.notification('success');
      }
    } catch (err) {
      logger.error('Achievement check failed', { error: err });
    }
  }, [haptic]);

  const loadUserStats = useCallback(async (checkAchievements = false) => {
    if (!userId) return;
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.stats(userId) });
    if (checkAchievements) {
      // Read fresh data from cache after invalidation completes
      const freshStats = queryClient.getQueryData<UserStats>(dashboardKeys.stats(userId));
      if (freshStats?.user.id) {
        checkForNewAchievements(freshStats.user.id).catch((err) =>
          logger.error('Achievement check failed', { error: err }),
        );
      }
    }
  }, [userId, queryClient, checkForNewAchievements]);

  const handleRefresh = useCallback(async () => {
    await loadUserStats(true);
  }, [loadUserStats]);

  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleQuestClick = useCallback((_questId: number) => {
    haptic.impact('light');
    navigate('/quests');
  }, [haptic, navigate]);

  return {
    stats: stats ?? null,
    loading,
    error,
    errorMessage: '',
    toastAchievement,
    setToastAchievement,
    loadUserStats,
    containerRef,
    pullDistance,
    refreshing,
    pullThreshold,
    touchHandlers,
    handleQuestClick,
  };
}
