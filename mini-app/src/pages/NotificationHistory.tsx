import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Bell, Trophy, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';

function getNotificationIcon(type: string) {
  switch (type) {
    case 'achievement_unlock':
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 'daily_summary':
      return <Calendar className="w-4 h-4 text-blue-400" />;
    case 'xp_gain':
    case 'level_up':
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'streak_warning':
      return <AlertCircle className="w-4 h-4 text-orange-400" />;
    default:
      return <Bell className="w-4 h-4 text-telegram-hint" />;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function NotificationHistory() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();

  const handleBack = useCallback(() => navigate('/settings'), [navigate]);
  useBackButton(handleBack);

  const { notifications, loading, error, refresh } = useNotificationHistory(user?.id);

  const handleRefresh = useCallback(async () => { refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  if (error) {
    return <ErrorSection message={t('notificationHistory.couldNotLoad')} onRetry={refresh} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-b-3xl shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <h1 className="text-2xl font-bold text-white">{t('notificationHistory.title')}</h1>
        <p className="text-blue-100 text-sm mt-1">{t('notificationHistory.subtitle')}</p>
      </div>

      <div className="px-4 mt-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-8 h-8 bg-telegram-hint/20 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-telegram-hint/20 rounded w-3/4" />
                    <div className="h-2.5 bg-telegram-hint/10 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Bell className="w-12 h-12 text-telegram-hint/40 mx-auto mb-4" />
            <p className="text-telegram-hint text-sm">{t('notificationHistory.empty')}</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif, index) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
              >
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-telegram-bg flex items-center justify-center flex-shrink-0">
                    {getNotificationIcon(notif.activity_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-telegram-text">{notif.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-telegram-hint">{formatDate(notif.created_at)}</span>
                      {notif.xp_change !== 0 && (
                        <span className={`text-[11px] font-medium ${notif.xp_change > 0 ? 'text-green-500' : 'text-red-400'}`}>
                          {notif.xp_change > 0 ? '+' : ''}{notif.xp_change} XP
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
