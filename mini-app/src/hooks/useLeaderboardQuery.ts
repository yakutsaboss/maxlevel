import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export type TimePeriod = 'all_time' | 'weekly' | 'monthly';

// Query keys
export const leaderboardKeys = {
  all: ['leaderboard'] as const,
  list: (period: TimePeriod, limit: number) => ['leaderboard', period, limit] as const,
};

export function useLeaderboard(period: TimePeriod, limit = 50) {
  return useQuery({
    queryKey: leaderboardKeys.list(period, limit),
    queryFn: async () => {
      const res = period === 'weekly'
        ? await apiClient.getWeeklyLeaderboard(limit)
        : period === 'monthly'
          ? await apiClient.getMonthlyLeaderboard(limit)
          : await apiClient.getLeaderboard(limit);
      return res.success && res.data ? res.data : [];
    },
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}
