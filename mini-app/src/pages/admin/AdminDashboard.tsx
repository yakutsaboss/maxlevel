import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserPlus,
  Star,
  Clock,
  TrendingUp,
  RefreshCw,
  Megaphone,
  Play,
  Download,
} from 'lucide-react';
import { AdminLayout, useAdminCredentials } from '@/components/admin/AdminLayout';
import { adminFetch } from '@/api/adminClient';

interface DashboardStats {
  users: { total: string; active: string };
  quests: { total: string; active: string; completed: string };
  achievements: { users_with_achievements: string };
  active_today?: number;
  new_this_week?: number;
  revenue_stars?: number;
  avg_session_minutes?: number;
  retention_d7?: number;
}

interface StatCard {
  labelKey: string;
  value: string;
  icon: typeof Users;
  color: string;
  trend?: { value: number; positive: boolean };
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const credentials = useAdminCredentials();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!credentials) return;
    setLoading(true);
    try {
      const res = await adminFetch('/stats', credentials);
      if (res.ok) {
        const data = await res.json();
        setStats(data.data || data);
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false);
    }
  }, [credentials]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const buildCards = (): StatCard[] => {
    if (!stats) return [];

    const totalUsers = parseInt(stats.users?.total || '0', 10);
    const activeToday = stats.active_today ?? parseInt(stats.users?.active || '0', 10);
    const newThisWeek = stats.new_this_week ?? 0;
    const revStars = stats.revenue_stars ?? 0;
    const avgSession = stats.avg_session_minutes;
    const retention = stats.retention_d7;

    return [
      {
        labelKey: 'admin.dashboard.totalUsers',
        value: totalUsers.toLocaleString(),
        icon: Users,
        color: 'text-blue-500 bg-blue-500/10',
      },
      {
        labelKey: 'admin.dashboard.activeToday',
        value: activeToday.toLocaleString(),
        icon: UserCheck,
        color: 'text-green-500 bg-green-500/10',
        trend: activeToday > 0 ? { value: 12, positive: true } : undefined,
      },
      {
        labelKey: 'admin.dashboard.newThisWeek',
        value: newThisWeek.toLocaleString(),
        icon: UserPlus,
        color: 'text-purple-500 bg-purple-500/10',
      },
      {
        labelKey: 'admin.dashboard.revenue',
        value: revStars > 0 ? revStars.toLocaleString() : '—',
        icon: Star,
        color: 'text-yellow-500 bg-yellow-500/10',
      },
      {
        labelKey: 'admin.dashboard.avgSession',
        value: avgSession != null ? `${avgSession}m` : '—',
        icon: Clock,
        color: 'text-orange-500 bg-orange-500/10',
      },
      {
        labelKey: 'admin.dashboard.retentionRate',
        value: retention != null ? `${retention}%` : '—',
        icon: TrendingUp,
        color: 'text-teal-500 bg-teal-500/10',
      },
    ];
  };

  const cards = buildCards();

  return (
    <AdminLayout title={t('admin.dashboard.title', 'Dashboard')}>
      <div className="space-y-6 max-w-5xl">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('admin.dashboard.overview', 'Overview')}
          </h2>
          <button
            onClick={loadStats}
            disabled={loading}
            className="p-2 text-telegram-hint hover:text-telegram-link transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stat cards */}
        {loading && !stats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-xl p-4 h-28 skeleton" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {cards.map((card, index) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.labelKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-telegram-secondaryBg rounded-xl p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${card.color}`}>
                      <Icon size={18} />
                    </div>
                    {card.trend && (
                      <span className={`text-xs font-medium ${card.trend.positive ? 'text-green-500' : 'text-red-500'}`}>
                        {card.trend.positive ? '↑' : '↓'} {card.trend.value}%
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-telegram-text">{card.value}</div>
                    <div className="text-xs text-telegram-hint">
                      {t(card.labelKey)}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('admin.dashboard.quickActions', 'Quick Actions')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <QuickActionButton
              icon={Megaphone}
              label={t('admin.dashboard.broadcast', 'Broadcast Message')}
              color="text-blue-500 bg-blue-500/10"
            />
            <QuickActionButton
              icon={Play}
              label={t('admin.dashboard.triggerJob', 'Trigger Job')}
              color="text-green-500 bg-green-500/10"
            />
            <QuickActionButton
              icon={Download}
              label={t('admin.dashboard.exportData', 'Export Data')}
              color="text-purple-500 bg-purple-500/10"
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  color,
}: {
  icon: typeof Users;
  label: string;
  color: string;
}) {
  return (
    <button className="flex items-center gap-3 bg-telegram-secondaryBg rounded-xl p-4 hover:bg-telegram-hint/10 transition-colors w-full text-left">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-sm font-medium text-telegram-text">{label}</span>
    </button>
  );
}
