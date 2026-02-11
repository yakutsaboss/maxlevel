import { useEffect, useState, useRef } from 'react';
import { apiClient } from '@/api/client';
import { UserStats, UserAchievement, Achievement } from '@/types';
import { getErrorMessage } from '@/hooks/useApiError';

export function useProfileData(userId: number | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [punishmentSettings, setPunishmentSettings] = useState<{ consent_given: boolean; intensity_level: string; safe_mode: boolean } | null>(null);
  const [punishmentHistory, setPunishmentHistory] = useState<Array<{ xp_deducted: number; punishment_type: string; applied_at: string; notes: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);

  const loadProfileData = async () => {
    if (!userId) { setLoading(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const signal = controller.signal;

    try {
      setLoading(true);
      setError(false);
      setErrorMessage('');
      const [statsRes, achievementsRes, allAchRes] = await Promise.all([
        apiClient.getUserStats(userId, { signal }),
        apiClient.getUserAchievements(userId, { signal }),
        apiClient.getAchievements({ signal }),
      ]);
      if (statsRes.success && statsRes.data) { setStats(statsRes.data); }
      if (achievementsRes.success && achievementsRes.data) { setAchievements(achievementsRes.data); }
      if (allAchRes.success && allAchRes.data) { setAllAchievements(allAchRes.data); }
      try {
        const punishRes = await apiClient.getPunishmentSettings(userId, { signal });
        if (punishRes.success && punishRes.data) { setPunishmentSettings(punishRes.data); }
        if (punishRes.success && punishRes.data?.consent_given) {
          try {
            const historyRes = await apiClient.getPunishmentHistory(userId, 1, 5, { signal });
            if (historyRes.success && historyRes.data?.punishments) {
              setPunishmentHistory(historyRes.data.punishments);
            }
          } catch { /* History API not available yet */ }
        }
      } catch { /* Punishment API not available yet — silently skip */ }
    } catch (err) {
      if (signal.aborted) return;
      console.error('Failed to load profile data:', err);
      setError(true);
      setErrorMessage(getErrorMessage(err));
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    return () => { abortRef.current?.abort(); };
  }, [userId]);

  return {
    stats,
    achievements,
    allAchievements,
    loading,
    error,
    errorMessage,
    punishmentSettings,
    punishmentHistory,
    loadProfileData,
    editModalOpen,
    setEditModalOpen,
    toast,
    setToast,
  };
}
