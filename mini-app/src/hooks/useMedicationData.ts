import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMedications,
  useTodaySchedule,
  useMedicationHistory,
  useAddMedicationMutation,
  useUpdateMedicationMutation,
  useDeleteMedicationMutation,
  useLogMedicationMutation,
  medicationKeys,
} from './useMedicationQuery.js';
import type { AddMedicationData, MedicationLogStatus } from '@/types';

export function useMedicationData(userId?: number) {
  const queryClient = useQueryClient();

  const medicationsQuery = useMedications(userId);
  const todayScheduleQuery = useTodaySchedule(userId);
  const historyQuery = useMedicationHistory(userId);

  const addMutation = useAddMedicationMutation();
  const updateMutation = useUpdateMedicationMutation();
  const deleteMutation = useDeleteMedicationMutation();
  const logMutation = useLogMedicationMutation();

  const addMedication = useCallback(
    (data: Omit<AddMedicationData, 'telegram_id'>) => {
      if (!userId) return;
      return addMutation.mutateAsync({ ...data, telegram_id: userId, userId });
    },
    [userId, addMutation],
  );

  const updateMedication = useCallback(
    (id: number, data: Partial<AddMedicationData>) => {
      if (!userId) return;
      return updateMutation.mutateAsync({ id, userId, data });
    },
    [userId, updateMutation],
  );

  const deleteMedication = useCallback(
    (id: number) => {
      if (!userId) return;
      return deleteMutation.mutateAsync({ id, userId, telegramId: userId });
    },
    [userId, deleteMutation],
  );

  const logMedication = useCallback(
    (medicationId: number, scheduledTime: string, status: MedicationLogStatus) => {
      if (!userId) return;
      return logMutation.mutateAsync({
        telegram_id: userId,
        medication_id: medicationId,
        scheduled_time: scheduledTime,
        status,
        userId,
      });
    },
    [userId, logMutation],
  );

  const refresh = useCallback(() => {
    if (!userId) return;
    queryClient.invalidateQueries({ queryKey: medicationKeys.list(userId) });
    queryClient.invalidateQueries({ queryKey: medicationKeys.todaySchedule(userId) });
    queryClient.invalidateQueries({ queryKey: medicationKeys.history(userId) });
  }, [userId, queryClient]);

  return {
    medications: medicationsQuery.data ?? [],
    todaySchedule: todayScheduleQuery.data ?? [],
    history: historyQuery.data ?? null,
    loading: medicationsQuery.isLoading || todayScheduleQuery.isLoading,
    error: medicationsQuery.error || todayScheduleQuery.error || historyQuery.error,
    addMedication,
    updateMedication,
    deleteMedication,
    logMedication,
    refresh,
  };
}
