import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '@/api/client';
import type { NotificationHistoryEntry } from '@/types';
import { logger } from '@/utils/logger';

interface UseNotificationHistoryReturn {
  notifications: NotificationHistoryEntry[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useNotificationHistory(userId: number | undefined, limit = 20): UseNotificationHistoryReturn {
  const [notifications, setNotifications] = useState<NotificationHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getNotificationHistory(userId, limit);
      if (!mountedRef.current) return;
      if (res.success && Array.isArray(res.data)) {
        setNotifications(res.data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load notifications';
      setError(msg);
      logger.error('useNotificationHistory loadData error', err as Record<string, unknown>);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId, limit]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return { notifications, loading, error, refresh };
}
