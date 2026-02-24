import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { apiClient } from '@/api/client';
import type { Quest } from '@/types';

// Query keys
export const questKeys = {
  all: ['quests'] as const,
  active: (userId: number) => ['quests', 'active', userId] as const,
  completed: (userId: number) => ['quests', 'completed', userId] as const,
  todayCheckins: (userId: number) => ['checkins', 'today', userId] as const,
};

export function useActiveQuests(userId: number | undefined) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';

  return useQuery({
    queryKey: [...questKeys.active(userId!), lang],
    queryFn: async () => {
      const res = await apiClient.getActiveQuests(userId!, lang);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useCompletedQuests(userId: number | undefined) {
  const { i18n } = useTranslation();
  const lang = i18n.language?.substring(0, 2) || 'en';

  return useQuery({
    queryKey: [...questKeys.completed(userId!), lang],
    queryFn: async () => {
      const res = await apiClient.getCompletedQuests(userId!, 50, lang);
      return res.success && res.data ? res.data : [];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTodayCheckins(userId: number | undefined) {
  return useQuery({
    queryKey: questKeys.todayCheckins(userId!),
    queryFn: async () => {
      const res = await apiClient.getTodayCheckins(userId!);
      return res.success && res.data ? res.data.count : 0;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

interface CheckinMutationVars {
  telegramId: number;
  questInstanceId: number;
  notes?: string;
}

export function useCheckinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ telegramId, questInstanceId, notes }: CheckinMutationVars) => {
      const res = await apiClient.createCheckin(telegramId, questInstanceId, notes);
      if (!res.success || !res.data) throw new Error('Check-in failed');
      return res.data;
    },
    onMutate: async ({ telegramId, questInstanceId }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: questKeys.active(telegramId) });
      await queryClient.cancelQueries({ queryKey: questKeys.todayCheckins(telegramId) });

      // Snapshot previous values
      const previousActive = queryClient.getQueryData<Quest[]>(questKeys.active(telegramId));
      const previousCheckins = queryClient.getQueryData<number>(questKeys.todayCheckins(telegramId));

      // Optimistically update active quests — increment progress
      if (previousActive) {
        queryClient.setQueryData<Quest[]>(questKeys.active(telegramId), (old) =>
          (old ?? []).map((q) =>
            q.id === questInstanceId
              ? { ...q, progress: Math.min(q.progress + 1, q.target) }
              : q,
          ),
        );
      }

      // Optimistically increment today's checkin count
      queryClient.setQueryData<number>(questKeys.todayCheckins(telegramId), (old) => (old ?? 0) + 1);

      return { previousActive, previousCheckins };
    },
    onError: (_err, { telegramId }, context) => {
      // Rollback to snapshot on error
      if (context?.previousActive !== undefined) {
        queryClient.setQueryData(questKeys.active(telegramId), context.previousActive);
      }
      if (context?.previousCheckins !== undefined) {
        queryClient.setQueryData(questKeys.todayCheckins(telegramId), context.previousCheckins);
      }
    },
    onSettled: (_data, _error, { telegramId }) => {
      // Always refetch after mutation settles to ensure server truth
      queryClient.invalidateQueries({ queryKey: questKeys.active(telegramId) });
      queryClient.invalidateQueries({ queryKey: questKeys.todayCheckins(telegramId) });
    },
  });
}

interface CompleteQuestVars {
  questId: number;
  progress: number;
  userId: number;
}

export function useCompleteQuestMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questId, progress }: CompleteQuestVars) => {
      const res = await apiClient.completeQuest(questId, progress);
      if (!res.success) throw new Error('Complete quest failed');
      return res.data;
    },
    onSettled: (_data, _error, { userId }) => {
      // Invalidate both active and completed after claiming reward
      queryClient.invalidateQueries({ queryKey: questKeys.active(userId) });
      queryClient.invalidateQueries({ queryKey: questKeys.completed(userId) });
    },
  });
}
