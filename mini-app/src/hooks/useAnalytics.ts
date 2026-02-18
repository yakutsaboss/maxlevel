import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ---- Types ----

export interface AnalyticsSummary {
  total_xp: number;
  level: number;
  quests_completed: number;
  quests_total: number;
  completion_rate: number;
  active_modes: number;
  active_streaks: number;
  best_streak: number;
  days_active: number;
  xp_this_week: number;
}

export interface ModeBreakdownItem {
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon: string;
  completion_rate: number;
  total_quests: number;
  completed_quests: number;
  xp_earned: number;
  streak: { current: number; longest: number };
}

export type TimeRange = '7d' | '30d' | 'all';

// ---- Hook ----

export function useAnalytics(userId: number | undefined) {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modes, setModes] = useState<ModeBreakdownItem[]>([]);
  const [range, setRange] = useState<TimeRange>('7d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : undefined;

  const fetchData = useCallback(async (timeRange: TimeRange) => {
    if (!userId) { setLoading(false); return; }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (initData) headers['X-Telegram-Init-Data'] = initData;

    try {
      const [summaryRes, modesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/analytics/${userId}/summary?range=${timeRange}`, {
          headers,
          signal: controller.signal,
        }),
        fetch(`${API_BASE_URL}/analytics/${userId}/modes?range=${timeRange}`, {
          headers,
          signal: controller.signal,
        }),
      ]);

      if (!summaryRes.ok) throw new Error(`Summary HTTP ${summaryRes.status}`);
      if (!modesRes.ok) throw new Error(`Modes HTTP ${modesRes.status}`);

      const [summaryJson, modesJson] = await Promise.all([
        summaryRes.json(),
        modesRes.json(),
      ]);

      if (!controller.signal.aborted) {
        setSummary(summaryJson.data ?? null);
        setModes(modesJson.data ?? []);
      }
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Failed to load analytics';
      logger.error('Analytics fetch failed', { error: err });
      setError(msg);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [userId, initData]);

  useEffect(() => {
    fetchData(range);
    return () => { abortRef.current?.abort(); };
  }, [range, fetchData]);

  const changeRange = useCallback((newRange: TimeRange) => {
    setRange(newRange);
  }, []);

  const retry = useCallback(() => {
    fetchData(range);
  }, [fetchData, range]);

  return {
    summary,
    modes,
    range,
    changeRange,
    loading,
    error,
    retry,
  };
}
