import { useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Trophy, TrendingUp, Calendar, Pill, Flame } from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useNotificationHistory } from '@/hooks/useNotificationHistory';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';

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

  const handleFilterChange = useCallback((filter: FilterType) => {
    haptic.selection();
    setActiveFilter(filter);
  }, [haptic]);

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

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 rounded-b-3xl shadow-lg" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}>
        <h1 className="text-2xl font-bold text-white">{t('notifications.title')}</h1>
        <p className="text-blue-100 text-sm mt-1">{t('notificationHistory.subtitle')}</p>
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
        ) : filteredNotifications.length === 0 ? (
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
              {filteredNotifications.map((notif, index) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
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
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
