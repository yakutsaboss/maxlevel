import { motion } from 'framer-motion';
import { Check, X, Clock } from 'lucide-react';

export interface MedicationDayLog {
  medication_name: string;
  dosage: string;
  color: string;
  status: string;
  scheduled_time: string;
  logged_at: string | null;
}

export interface MedicationDayDetailProps {
  date: string;
  logs: MedicationDayLog[];
}

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  red: 'bg-red-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { icon: typeof Check; bg: string; text: string; label: string }> = {
    taken: { icon: Check, bg: 'bg-green-500/10', text: 'text-green-600', label: 'Taken' },
    skipped: { icon: X, bg: 'bg-red-500/10', text: 'text-red-500', label: 'Skipped' },
    pending: { icon: Clock, bg: 'bg-telegram-hint/10', text: 'text-telegram-hint', label: 'Pending' },
    postponed: { icon: Clock, bg: 'bg-yellow-500/10', text: 'text-yellow-600', label: 'Postponed' },
  };

  const c = config[status] || config.pending;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <Icon className="w-3 h-3" />
      {c.label}
    </span>
  );
}

export function MedicationDayDetail({ date, logs }: MedicationDayDetailProps) {
  if (logs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10 text-center"
      >
        <Clock className="w-8 h-8 text-telegram-hint mx-auto mb-2" />
        <p className="text-sm text-telegram-hint">No medications scheduled for this day</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      {/* Date header */}
      <h3 className="text-sm font-semibold text-telegram-text mb-3">{formatDate(date)}</h3>

      {/* Medication list */}
      <div className="space-y-2.5">
        {logs.map((log, index) => (
          <motion.div
            key={`${log.medication_name}-${log.scheduled_time}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-center gap-3"
          >
            {/* Color dot */}
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLOR_MAP[log.color] || 'bg-blue-500'}`} />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${
                  log.status === 'skipped' ? 'line-through text-telegram-hint' : 'text-telegram-text'
                }`}>
                  {log.medication_name}
                </span>
                {log.dosage && (
                  <span className="text-xs text-telegram-hint flex-shrink-0">{log.dosage}</span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-telegram-hint">{formatTime(log.scheduled_time)}</span>
                {log.logged_at && log.status === 'taken' && (
                  <span className="text-[11px] text-telegram-hint">
                    &middot; Logged {formatTime(log.logged_at.slice(11, 16))}
                  </span>
                )}
              </div>
            </div>

            {/* Status badge */}
            <StatusBadge status={log.status} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
