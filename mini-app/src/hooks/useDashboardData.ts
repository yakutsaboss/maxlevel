import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { UserStats, Achievement } from '@/types';
import { getErrorMessage } from '@/hooks/useApiError';
import type { HapticWithNotification } from '@/types/telegram';
import { logger } from '@/utils/logger';

interface UseDashboardDataParams {
  userId: number | undefined;
  haptic: HapticWithNotification;
}

export function useDashboardData({ userId, haptic }: UseDashboardDataParams) {
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastAchievement, setToastAchievement] = useState<Achievement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const checkForNewAchievements = async (dbUserId: number) => {
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
  };

  const loadUserStats = async (checkAchievements = false) => {
    if (!userId) { setLoading(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setLoading(true);
      setError(false);
      setErrorMessage('');
      const response = await apiClient.getUserStats(userId, { signal: controller.signal });
      if (response.success && response.data) {
        setStats(response.data);
        if (checkAchievements && response.data.user.id) {
          checkForNewAchievements(response.data.user.id).catch((err) => logger.error('Achievement check failed', { error: err }));
        }
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      logger.error('Failed to load user stats', { error: err });
      setError(true);
      setErrorMessage(getErrorMessage(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    await loadUserStats(true);
  }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => {
    loadUserStats(false);
    return () => { abortRef.current?.abort(); };
  }, [userId]);

  const handleQuestClick = useCallback((_questId: number) => { haptic.impact('light'); navigate('/quests'); }, [haptic, navigate]);

  return {
    stats,
    loading,
    error,
    errorMessage,
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
