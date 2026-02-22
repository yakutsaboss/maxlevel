import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { UserAchievement, Achievement, PunishmentSettings } from '@/types';

// Query keys
export const profileKeys = {
  all: ['profile'] as const,
  stats: (userId: number) => ['profile', 'stats', userId] as const,
  achievements: (userId: number) => ['profile', 'achievements', userId] as const,
  punishments: (userId: number) => ['profile', 'punishments', userId] as const,
};

export function useProfileStats(userId: number | undefined) {
  return useQuery({
    queryKey: profileKeys.stats(userId!),
    queryFn: async () => {
      const res = await apiClient.getUserStats(userId!);
      if (!res.success || !res.data) throw new Error('Failed to load profile stats');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useProfileAchievements(userId: number | undefined) {
  return useQuery({
    queryKey: profileKeys.achievements(userId!),
    queryFn: async () => {
      const [userAchRes, allAchRes] = await Promise.all([
        apiClient.getUserAchievements(userId!),
        apiClient.getAchievements(),
      ]);
      return {
        userAchievements: (userAchRes.success && userAchRes.data ? userAchRes.data : []) as UserAchievement[],
        allAchievements: (allAchRes.success && allAchRes.data ? allAchRes.data : []) as Achievement[],
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

interface PunishmentsData {
  settings: PunishmentSettings | null;
  history: Array<{ xp_deducted: number; punishment_type: string; applied_at: string; notes: string }>;
}

export function useProfilePunishments(userId: number | undefined) {
  return useQuery<PunishmentsData>({
    queryKey: profileKeys.punishments(userId!),
    queryFn: async () => {
      try {
        const settingsRes = await apiClient.getPunishmentSettings(userId!);
        const settings = settingsRes.success && settingsRes.data ? settingsRes.data : null;

        let history: PunishmentsData['history'] = [];
        if (settings?.consent_given) {
          try {
            const historyRes = await apiClient.getPunishmentHistory(userId!, 1, 5);
            if (historyRes.success && historyRes.data?.punishments) {
              history = historyRes.data.punishments;
            }
          } catch { /* History API not available yet */ }
        }

        return { settings, history };
      } catch {
        // Punishment API not available yet — return defaults
        return { settings: null, history: [] };
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
