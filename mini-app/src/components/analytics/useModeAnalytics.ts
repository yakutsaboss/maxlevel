import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// ---- Types ----

export interface ModeStreak {
  current: number;
  longest: number;
}

export interface ModeAnalyticsData {
  mode_id: number;
  mode_name: string;
  display_name: string;
  icon: string;
  completion_rate: number;
  total_quests: number;
  completed_quests: number;
  xp_earned: number;
  streak: ModeStreak;
}

export interface QuestHistoryItem {
  id: number;
  title: string;
  type: string;
  difficulty: string;
  status: string;
  xp_awarded: number;
  date: string;
  completed_at: string | null;
  check_ins: number;
  target: number;
}

export interface WeeklyXpItem {
  day: string;
  xp: number;
}

export interface ModeDetailData {
  mode: {
    id: number;
    name: string;
    display_name: string;
    icon: string;
  };
  progress: {
    completion_rate: number;
    total_quests: number;
    completed_quests: number;
  };
  streak: {
    current: number;
    longest: number;
    last_activity: string | null;
  };
  weekly_xp: WeeklyXpItem[];
  quest_history: QuestHistoryItem[];
}

export interface ModeAnalyticsProps {
  userId: number;
  mode?: string;
}

// ---- Hook ----

export function useModeAnalytics(userId: number, initialMode?: string) {
  const [modesData, setModesData] = useState<ModeAnalyticsData[]>([]);
  const [detailData, setDetailData] = useState<ModeDetailData | null>(null);
  const [selectedMode, setSelectedMode] = useState<string | null>(initialMode ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initData = typeof window !== 'undefined' ? window.Telegram?.WebApp?.initData : undefined;

  const fetchModes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (initData) headers['X-Telegram-Init-Data'] = initData;

      const res = await fetch(`${API_BASE_URL}/analytics/${userId}/modes`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setModesData(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [userId, initData]);

  const fetchModeDetail = useCallback(async (modeName: string) => {
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (initData) headers['X-Telegram-Init-Data'] = initData;

      const res = await fetch(`${API_BASE_URL}/analytics/${userId}/modes/${modeName}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDetailData(json.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mode details');
    } finally {
      setLoading(false);
    }
  }, [userId, initData]);

  useEffect(() => {
    if (selectedMode) {
      fetchModeDetail(selectedMode);
    } else {
      fetchModes();
    }
  }, [selectedMode, fetchModes, fetchModeDetail]);

  const handleSelectMode = (modeName: string) => {
    setSelectedMode(modeName);
    setDetailData(null);
  };

  const handleBack = () => {
    setSelectedMode(null);
    setDetailData(null);
  };

  const retry = () => {
    if (selectedMode) {
      fetchModeDetail(selectedMode);
    } else {
      fetchModes();
    }
  };

  return {
    modesData,
    detailData,
    selectedMode,
    loading,
    error,
    handleSelectMode,
    handleBack,
    retry,
  };
}
