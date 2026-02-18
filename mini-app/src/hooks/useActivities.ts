import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { fetchActivityTypes, fetchActivityStats, quickLogActivity } from '@/api/activities';
import type { ActivityType, ActivityStat, ActivityUserStats } from '@/api/activities';
import { logger } from '@/utils/logger';

export type ActivityCategory = 'all' | 'cardio' | 'strength' | 'flexibility' | 'sports' | 'outdoor' | 'mind-body';

export interface ActivityWithStats extends ActivityType {
  last_done: string | null;
  times_done: number;
  personal_record_duration: number | null;
  personal_record_calories: number | null;
}

interface UseActivitiesReturn {
  activities: ActivityWithStats[];
  filteredActivities: ActivityWithStats[];
  activitiesThisWeek: number;
  caloriesBurnedThisWeek: number;
  loading: boolean;
  error: string | null;
  category: ActivityCategory;
  setCategory: (cat: ActivityCategory) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  quickLog: (activityTypeId: number) => Promise<{ xp_awarded: number }>;
  refresh: () => Promise<void>;
}

export function useActivities(userId: number | undefined): UseActivitiesReturn {
  const [activityTypes, setActivityTypes] = useState<ActivityType[]>([]);
  const [userStats, setUserStats] = useState<ActivityUserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ActivityCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const [types, stats] = await Promise.all([
        fetchActivityTypes(),
        fetchActivityStats(userId),
      ]);
      if (!mountedRef.current) return;
      setActivityTypes(Array.isArray(types) ? types : []);
      setUserStats(stats);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load activities';
      setError(msg);
      logger.error('useActivities loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const activities: ActivityWithStats[] = useMemo(() => {
    const statsMap = new Map<number, ActivityStat>();
    if (userStats?.activity_stats) {
      for (const stat of userStats.activity_stats) {
        statsMap.set(stat.activity_type_id, stat);
      }
    }
    return activityTypes.map((type) => {
      const stat = statsMap.get(type.id);
      return {
        ...type,
        last_done: stat?.last_done ?? null,
        times_done: stat?.times_done ?? 0,
        personal_record_duration: stat?.personal_record_duration ?? null,
        personal_record_calories: stat?.personal_record_calories ?? null,
      };
    });
  }, [activityTypes, userStats]);

  const filteredActivities = useMemo(() => {
    let result = activities;
    if (category !== 'all') {
      result = result.filter((a) => a.category === category);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((a) => a.name.toLowerCase().includes(q));
    }
    return result;
  }, [activities, category, searchQuery]);

  const quickLog = useCallback(async (activityTypeId: number) => {
    if (!userId) throw new Error('User not found');
    const result = await quickLogActivity(userId, activityTypeId);
    // Refresh stats after logging
    if (mountedRef.current) {
      try {
        const stats = await fetchActivityStats(userId);
        if (mountedRef.current) setUserStats(stats);
      } catch {
        // Silently fail the refresh — the log itself succeeded
      }
    }
    return result;
  }, [userId]);

  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    activities: filteredActivities,
    filteredActivities,
    activitiesThisWeek: userStats?.activities_this_week ?? 0,
    caloriesBurnedThisWeek: userStats?.calories_burned_this_week ?? 0,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    quickLog,
    refresh,
  };
}
