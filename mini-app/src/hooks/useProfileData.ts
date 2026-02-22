import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileStats, useProfileAchievements, useProfilePunishments, profileKeys } from './useProfileQuery';

export function useProfileData(userId: number | undefined) {
  const queryClient = useQueryClient();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  // React Query hooks — replace manual useState + fetch + AbortController
  const statsQuery = useProfileStats(userId);
  const achievementsQuery = useProfileAchievements(userId);
  const punishmentsQuery = useProfilePunishments(userId);

  const loading = statsQuery.isLoading || achievementsQuery.isLoading;
  const error = statsQuery.isError;

  const loadProfileData = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: profileKeys.stats(userId) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.achievements(userId) }),
      queryClient.invalidateQueries({ queryKey: profileKeys.punishments(userId) }),
    ]);
  }, [userId, queryClient]);

  return {
    stats: statsQuery.data ?? null,
    achievements: achievementsQuery.data?.userAchievements ?? [],
    allAchievements: achievementsQuery.data?.allAchievements ?? [],
    loading,
    error,
    errorMessage: '',
    punishmentSettings: punishmentsQuery.data?.settings ?? null,
    punishmentHistory: punishmentsQuery.data?.history ?? [],
    loadProfileData,
    editModalOpen,
    setEditModalOpen,
    toast,
    setToast,
  };
}
