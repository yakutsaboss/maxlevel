import { useEffect, useState } from 'react';
import { apiClient } from '@/api/client';
import { UserStats, UserAchievement, Achievement } from '@/types';

export function useProfileData(userId: number | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  const [punishmentSettings, setPunishmentSettings] = useState<{ consent_given: boolean; intensity_level: string; safe_mode: boolean } | null>(null);
  const [punishmentHistory, setPunishmentHistory] = useState<Array<{ xp_deducted: number; punishment_type: string; applied_at: string; notes: string }>>([]);

  const loadProfileData = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [statsRes, achievementsRes, allAchRes] = await Promise.all([
        apiClient.getUserStats(userId),
        apiClient.getUserAchievements(userId),
        apiClient.getAchievements(),
      ]);
      if (statsRes.success && statsRes.data) { setStats(statsRes.data); }
      if (achievementsRes.success && achievementsRes.data) { setAchievements(achievementsRes.data); }
      if (allAchRes.success && allAchRes.data) { setAllAchievements(allAchRes.data); }
      try {
        const punishRes = await apiClient.getPunishmentSettings(userId);
        if (punishRes.success && punishRes.data) { setPunishmentSettings(punishRes.data); }
        if (punishRes.success && punishRes.data?.consent_given) {
          try {
            const historyRes = await apiClient.getPunishmentHistory(userId);
            if (historyRes.success && historyRes.data?.punishments) {
              setPunishmentHistory(historyRes.data.punishments);
            }
          } catch { /* History API not available yet */ }
        }
      } catch { /* Punishment API not available yet — silently skip */ }
    } catch (error) {
      console.error('Failed to load profile data:', error);
      setError(true);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadProfileData(); }, [userId]);

  return {
    stats,
    achievements,
    allAchievements,
    loading,
    error,
    punishmentSettings,
    punishmentHistory,
    loadProfileData,
    editModalOpen,
    setEditModalOpen,
    toast,
    setToast,
  };
}
