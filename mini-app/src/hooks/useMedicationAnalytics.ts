import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export interface DailyAdherence {
  date: string;
  taken: number;
  total: number;
  rate: number;
}

export interface PerMedicationStat {
  medication_id: number;
  name: string;
  color: string;
  taken: number;
  total: number;
  rate: number;
}

export interface MedicationAnalyticsData {
  daily_adherence: DailyAdherence[];
  per_medication: PerMedicationStat[];
  streaks: { current: number; best: number };
  summary: {
    week_rate: number;
    prev_week_rate: number;
    month_rate: number;
    total_taken: number;
    total_scheduled: number;
  };
}

export function useMedicationAnalytics(userId: number | undefined, days = 30) {
  return useQuery({
    queryKey: ['medications', 'analytics', userId, days],
    queryFn: async () => {
      const res = await apiClient.getMedicationAnalytics(userId!, days);
      if (!res.success || !res.data) throw new Error('Failed to load analytics');
      return res.data as MedicationAnalyticsData;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
