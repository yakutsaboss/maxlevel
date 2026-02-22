import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UserStats } from '@/types';

// Query keys
export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: (userId: number) => ['dashboard', 'stats', userId] as const,
};

async function fetchDashboardStats(userId: number): Promise<UserStats> {
  const res = await apiClient.getUserStats(userId);
  if (!res.success || !res.data) throw new Error('Failed to load dashboard stats');
  return res.data;
}

export function useDashboardStats(userId: number | undefined) {
  return useQuery({
    queryKey: dashboardKeys.stats(userId!),
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useDashboardQuests(userId: number | undefined) {
  return useQuery({
    queryKey: dashboardKeys.stats(userId!),
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: UserStats) => data.activeQuests,
  });
}

export function useDashboardAchievements(userId: number | undefined) {
  return useQuery({
    queryKey: dashboardKeys.stats(userId!),
    queryFn: () => fetchDashboardStats(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: UserStats) => data.recentAchievements,
  });
}
