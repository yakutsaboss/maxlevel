import { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { API_BASE_URL } from '@/api/adminClient';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error';
  source: string;
  message: string;
}

interface AdminLogsProps {
  credentials: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'text-green-400 bg-green-400/10',
  error: 'text-red-400 bg-red-400/10',
};

export function AdminLogs({ credentials }: AdminLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/logs?limit=100`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch {
      // Silently fail — user can manually retry
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, fetchLogs]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const formatTime = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  // Loading skeleton
  if (loading && logs.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">System Logs</h3>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <div className="skeleton w-12 h-5 rounded" />
              <div className="skeleton w-24 h-4 rounded" />
              <div className="skeleton w-32 h-4 rounded ml-auto" />
            </div>
            <div className="skeleton w-full h-4 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          System Logs ({logs.length})
        </h3>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="flex items-center gap-1.5 text-xs text-telegram-hint"
            title={autoRefresh ? 'Disable auto-refresh' : 'Enable auto-refresh (30s)'}
          >
            {autoRefresh ? (
              <ToggleRight size={20} className="text-telegram-button" />
            ) : (
              <ToggleLeft size={20} />
            )}
            Auto
          </button>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Log entries */}
      {logs.length === 0 ? (
        <div className="bg-telegram-secondaryBg rounded-xl p-8 text-center">
          <p className="text-telegram-hint text-sm">No log entries found</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[70vh] overflow-y-auto hide-scrollbar">
          {logs.map((log, i) => (
            <div
              key={`${log.timestamp}-${i}`}
              className="bg-telegram-secondaryBg rounded-xl p-3 space-y-1"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                    LEVEL_COLORS[log.level] || 'text-telegram-hint bg-telegram-hint/10'
                  }`}
                >
                  {log.level.toUpperCase()}
                </span>
                <span className="text-xs text-telegram-link font-medium">
                  {log.source}
                </span>
                <span className="text-xs text-telegram-hint ml-auto">
                  {formatTime(log.timestamp)}
                </span>
              </div>
              <p className="text-sm text-telegram-text break-words">
                {log.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
