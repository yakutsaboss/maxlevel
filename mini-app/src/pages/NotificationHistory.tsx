import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trophy, TrendingUp, Calendar, Pill, Flame, CheckCheck } from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { NotificationHistorySkeleton } from '@/components/notifications/NotificationHistorySkeleton';
import { apiClient } from '@/api/client';

type FilterType = 'all' | 'quest' | 'achievement' | 'medication' | 'streak';

const FILTER_ACTIVITY_TYPES: Record<FilterType, string[]> = {
  all: [],
  quest: ['quest_complete', 'quest_assigned', 'daily_summary'],
  achievement: ['achievement_unlock'],
  medication: ['medication_taken', 'medication_missed', 'medication_reminder'],
  streak: ['streak_warning', 'streak_milestone'],
};

function getNotificationIcon(type: string) {
  switch (type) {
    case 'achievement_unlock':
      return <Trophy className="w-4 h-4 text-yellow-400" />;
    case 'daily_summary':
    case 'quest_complete':
    case 'quest_assigned':
      return <Calendar className="w-4 h-4 text-blue-400" />;
    case 'xp_gain':
    case 'level_up':
      return <TrendingUp className="w-4 h-4 text-green-400" />;
    case 'streak_warning':
    case 'streak_milestone':
      return <Flame className="w-4 h-4 text-orange-400" />;
    case 'medication_taken':
    case 'medication_missed':
    case 'medication_reminder':
      return <Pill className="w-4 h-4 text-emerald-400" />;
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
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [readIds, setReadIds] = useState<Set<number>>(new Set());
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const handleBack = useCallback(() => navigate('/settings'), [navigate]);
  useBackButton(handleBack);

  const { notifications, loading, error, refresh } = useNotificationHistory(user?.id);

  const handleRefresh = useCallback(async () => { refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const filteredNotifications = useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const types = FILTER_ACTIVITY_TYPES[activeFilter];
    return notifications.filter((n) => types.includes(n.activity_type));
  }, [notifications, activeFilter]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read && !readIds.has(n.id)).length;
  }, [notifications, readIds]);

  const handleFilterChange = useCallback((filter: FilterType) => {
    haptic.selection();
    setActiveFilter(filter);
  }, [haptic]);

  const handleMarkRead = useCallback(async (notifId: number) => {
    if (readIds.has(notifId)) return;
    haptic.selection();
    setReadIds((prev) => new Set(prev).add(notifId));
    try {
      await apiClient.markNotificationRead(notifId);
    } catch { /* optimistic — already marked locally */ }
  }, [readIds, haptic]);

  const handleMarkAllRead = useCallback(async () => {
    if (!user?.id || markingAllRead) return;
    haptic.impact('medium');
    setMarkingAllRead(true);
    try {
      await apiClient.markAllNotificationsRead(user.id);
      setReadIds(new Set(notifications.map((n) => n.id)));
    } catch { /* ignore */ }
    setMarkingAllRead(false);
  }, [user?.id, markingAllRead, haptic, notifications]);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: t('notifications.filterAll') },
    { key: 'quest', label: t('notifications.filterQuest') },
    { key: 'achievement', label: t('notifications.filterAchievement') },
    { key: 'medication', label: t('notifications.filterMedication') },
    { key: 'streak', label: t('notifications.filterStreak') },
  ];

  if (error) {
    return <ErrorSection message={t('notificationHistory.couldNotLoad')} onRetry={refresh} />;
  }

  if (loading) {
    return <NotificationHistorySkeleton />;
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('notifications.title')}</h1>
            <p className="text-blue-100 text-sm mt-1">{t('notificationHistory.subtitle')}</p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t('notifications.markAllRead', 'Mark all read')}
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-4 mt-4 overflow-x-auto">
        <div className="flex gap-2 pb-1">
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterChange(filter.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeFilter === filter.key
                  ? 'bg-telegram-link text-white'
                  : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/20'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-4">
        {filteredNotifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <Bell className="w-12 h-12 text-telegram-hint/40 mx-auto mb-4" />
            <p className="text-telegram-text font-medium mb-1">{t('notifications.empty')}</p>
            {activeFilter !== 'all' && (
              <p className="text-telegram-hint text-xs mt-1">
                {t('notificationHistory.tryAll')}
              </p>
            )}
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2">
              {filteredNotifications.map((notif, index) => {
                const isRead = notif.is_read || readIds.has(notif.id);
                return (
                  <motion.div
                    key={notif.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => !isRead && handleMarkRead(notif.id)}
                    className={`rounded-2xl p-4 border transition-colors cursor-pointer ${
                      isRead
                        ? 'bg-telegram-secondaryBg border-telegram-hint/10 opacity-70'
                        : 'bg-telegram-secondaryBg border-telegram-link/20'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative w-8 h-8 rounded-full bg-telegram-bg flex items-center justify-center flex-shrink-0">
                        {getNotificationIcon(notif.activity_type)}
                        {!isRead && (
                          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-telegram-link rounded-full border-2 border-telegram-secondaryBg" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${isRead ? 'text-telegram-hint' : 'text-telegram-text font-medium'}`}>{notif.description}</p>
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
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
