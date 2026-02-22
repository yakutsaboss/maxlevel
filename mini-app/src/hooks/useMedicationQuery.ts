import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { Medication, TodayScheduleItem, AddMedicationData, LogMedicationData, MedicationLogStatus } from '@/types';

// Query keys
export const medicationKeys = {
  all: ['medications'] as const,
  list: (userId: number) => ['medications', 'list', userId] as const,
  todaySchedule: (userId: number) => ['medications', 'today', userId] as const,
  history: (userId: number, days?: number) => ['medications', 'history', userId, days ?? 7] as const,
};

// --- Queries ---

export function useMedications(userId: number | undefined) {
  return useQuery({
    queryKey: medicationKeys.list(userId!),
    queryFn: async () => {
      const res = await apiClient.getMedications(userId!);
      if (!res.success || !res.data) throw new Error('Failed to load medications');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useTodaySchedule(userId: number | undefined) {
  return useQuery({
    queryKey: medicationKeys.todaySchedule(userId!),
    queryFn: async () => {
      const res = await apiClient.getTodaySchedule(userId!);
      if (!res.success || !res.data) throw new Error('Failed to load today schedule');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute — changes frequently as user logs
  });
}

export function useMedicationHistory(userId: number | undefined, days = 7) {
  return useQuery({
    queryKey: medicationKeys.history(userId!, days),
    queryFn: async () => {
      const res = await apiClient.getMedicationHistory(userId!, days);
      if (!res.success || !res.data) throw new Error('Failed to load medication history');
      return res.data;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// --- Mutations ---

interface AddMedicationVars extends AddMedicationData {
  userId: number;
}

export function useAddMedicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: AddMedicationVars) => {
      const { userId: _, ...data } = vars;
      const res = await apiClient.addMedication(data);
      if (!res.success) throw new Error(res.error || 'Failed to add medication');
      return res.data!;
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(vars.userId) });
      queryClient.invalidateQueries({ queryKey: medicationKeys.todaySchedule(vars.userId) });
    },
  });
}

interface UpdateMedicationVars {
  id: number;
  userId: number;
  data: Partial<AddMedicationData>;
}

export function useUpdateMedicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: UpdateMedicationVars) => {
      const res = await apiClient.updateMedication(id, data);
      if (!res.success) throw new Error(res.error || 'Failed to update medication');
      return res.data!;
    },
    onSettled: (_data, _error, vars) => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(vars.userId) });
      queryClient.invalidateQueries({ queryKey: medicationKeys.todaySchedule(vars.userId) });
    },
  });
}

interface DeleteMedicationVars {
  id: number;
  userId: number;
  telegramId: number;
}

export function useDeleteMedicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, telegramId }: DeleteMedicationVars) => {
      const res = await apiClient.deleteMedication(id, telegramId);
      if (!res.success) throw new Error(res.error || 'Failed to delete medication');
    },
    onMutate: async ({ id, userId }) => {
      // Optimistic remove from list
      await queryClient.cancelQueries({ queryKey: medicationKeys.list(userId) });
      const previousMeds = queryClient.getQueryData<Medication[]>(medicationKeys.list(userId));
      if (previousMeds) {
        queryClient.setQueryData<Medication[]>(
          medicationKeys.list(userId),
          previousMeds.filter((m) => m.id !== id),
        );
      }
      return { previousMeds };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousMeds !== undefined) {
        queryClient.setQueryData(medicationKeys.list(userId), context.previousMeds);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.list(userId) });
      queryClient.invalidateQueries({ queryKey: medicationKeys.todaySchedule(userId) });
    },
  });
}

interface LogMedicationVars extends LogMedicationData {
  userId: number;
}

export function useLogMedicationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vars: LogMedicationVars) => {
      const { userId: _, ...data } = vars;
      const res = await apiClient.logMedication(data);
      if (!res.success) throw new Error(res.error || 'Failed to log medication');
      return res.data!;
    },
    onMutate: async ({ userId, medication_id, scheduled_time, status }) => {
      // Optimistic status update in todaySchedule
      await queryClient.cancelQueries({ queryKey: medicationKeys.todaySchedule(userId) });
      const previousSchedule = queryClient.getQueryData<TodayScheduleItem[]>(medicationKeys.todaySchedule(userId));
      if (previousSchedule) {
        queryClient.setQueryData<TodayScheduleItem[]>(
          medicationKeys.todaySchedule(userId),
          previousSchedule.map((item) =>
            item.medication_id === medication_id && item.scheduled_time === scheduled_time
              ? { ...item, status: status as MedicationLogStatus | 'pending' }
              : item,
          ),
        );
      }
      return { previousSchedule };
    },
    onError: (_err, { userId }, context) => {
      if (context?.previousSchedule !== undefined) {
        queryClient.setQueryData(medicationKeys.todaySchedule(userId), context.previousSchedule);
      }
    },
    onSettled: (_data, _error, { userId }) => {
      queryClient.invalidateQueries({ queryKey: medicationKeys.todaySchedule(userId) });
      queryClient.invalidateQueries({ queryKey: medicationKeys.history(userId) });
    },
  });
}
