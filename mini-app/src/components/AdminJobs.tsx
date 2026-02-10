import { useState, useEffect, useCallback } from 'react';
import { Play, RefreshCw, Clock } from 'lucide-react';
import { Toast } from '@/components/Toast';
import { API_BASE_URL } from '@/api/adminClient';

interface Job {
  name: string;
  cron: string;
}

interface AdminJobsProps {
  credentials: string;
}

export function AdminJobs({ credentials }: AdminJobsProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/admin/jobs`, {
        headers: {
          'Authorization': `Basic ${credentials}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setJobs(data.jobs || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleTrigger = useCallback(async (jobName: string) => {
    const confirmed = window.confirm(`Trigger job "${jobName}" now?`);
    if (!confirmed) return;

    setTriggeringJob(jobName);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/jobs/${encodeURIComponent(jobName)}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        setToast({
          message: data.message || `Job "${jobName}" triggered`,
          variant: 'success',
        });
      } else if (res.status === 404) {
        setToast({ message: `Job "${jobName}" not found`, variant: 'error' });
      } else if (res.status === 503) {
        setToast({ message: 'Job queue is not running', variant: 'error' });
      } else {
        setToast({ message: `Failed to trigger: ${res.status}`, variant: 'error' });
      }
    } catch {
      setToast({ message: 'Connection failed', variant: 'error' });
    } finally {
      setTriggeringJob(null);
    }
  }, [credentials]);

  const formatCron = (cron: string) => {
    const presets: Record<string, string> = {
      '0 0 * * *': 'Daily at midnight',
      '0 */6 * * *': 'Every 6 hours',
      '0 */12 * * *': 'Every 12 hours',
      '*/30 * * * *': 'Every 30 min',
      '*/15 * * * *': 'Every 15 min',
      '0 * * * *': 'Every hour',
      '0 9 * * *': 'Daily at 9:00',
      '0 21 * * *': 'Daily at 21:00',
    };
    return presets[cron] || cron;
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">Background Jobs</h3>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-2">
              <div className="skeleton w-40 h-5 rounded" />
              <div className="skeleton w-28 h-4 rounded" />
            </div>
            <div className="skeleton w-20 h-9 rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Background Jobs ({jobs.length})
        </h3>
        <button
          onClick={() => { setLoading(true); fetchJobs(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-telegram-secondaryBg rounded-lg text-xs text-telegram-hint hover:text-telegram-text transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Job list */}
      {jobs.length === 0 ? (
        <div className="bg-telegram-secondaryBg rounded-xl p-8 text-center">
          <p className="text-telegram-hint text-sm">No registered jobs</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.name}
              className="bg-telegram-secondaryBg rounded-xl p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-telegram-text truncate">
                  {job.name}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-telegram-hint">
                  <Clock size={12} />
                  {formatCron(job.cron)}
                </div>
              </div>
              <button
                onClick={() => handleTrigger(job.name)}
                disabled={triggeringJob === job.name}
                className="flex items-center gap-1.5 px-3 py-2 bg-telegram-button/10 text-telegram-button rounded-lg text-xs font-medium hover:bg-telegram-button/20 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                {triggeringJob === job.name ? (
                  <div className="w-3.5 h-3.5 border-2 border-telegram-button/30 border-t-telegram-button rounded-full animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                Trigger
              </button>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <Toast message={toast.message} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
