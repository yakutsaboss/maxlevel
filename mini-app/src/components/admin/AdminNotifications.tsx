/**
 * Admin Notification Center — bell icon + dropdown
 * Shows new registrations, achievement unlocks, payments, system alerts, tier changes.
 * Polls unread count every 30 seconds.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, UserPlus, Trophy, CreditCard, AlertTriangle, ArrowUpCircle, Check, Loader2 } from 'lucide-react';
import { adminFetch } from '@/api/adminClient';

interface AdminNotification {
  id: number;
  type: 'new_registration' | 'achievement_unlock' | 'payment' | 'system_alert' | 'tier_change';
  title: string;
  message: string | null;
  related_user_id: number | null;
  related_username: string | null;
  related_first_name: string | null;
  is_read: boolean;
  created_at: string;
}

interface AdminNotificationsProps {
  credentials: string;
  onNavigateToPlayer?: (userId: number) => void;
}

type FilterType = 'all' | 'new_registration' | 'achievement_unlock' | 'payment' | 'system_alert' | 'tier_change';

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new_registration', label: 'Registrations' },
  { key: 'achievement_unlock', label: 'Achievements' },
  { key: 'payment', label: 'Payments' },
  { key: 'system_alert', label: 'Alerts' },
  { key: 'tier_change', label: 'Tiers' },
];

const TYPE_ICONS: Record<AdminNotification['type'], typeof Bell> = {
  new_registration: UserPlus,
  achievement_unlock: Trophy,
  payment: CreditCard,
  system_alert: AlertTriangle,
  tier_change: ArrowUpCircle,
};

const TYPE_COLORS: Record<AdminNotification['type'], string> = {
  new_registration: 'text-blue-500',
  achievement_unlock: 'text-yellow-500',
  payment: 'text-green-500',
  system_alert: 'text-red-500',
  tier_change: 'text-purple-500',
};

const ACCENT_BORDERS: Record<AdminNotification['type'], string> = {
  new_registration: 'border-l-blue-500',
  achievement_unlock: 'border-l-yellow-500',
  payment: 'border-l-green-500',
  system_alert: 'border-l-red-500',
  tier_change: 'border-l-purple-500',
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const POLL_INTERVAL = 30_000;
const PAGE_SIZE = 20;

export function AdminNotifications({ credentials, onNavigateToPlayer }: AdminNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await adminFetch('/notifications/unread-count', credentials);
      if (!res.ok || !mountedRef.current) return;
      const json = await res.json();
      if (mountedRef.current && json.success) {
        setUnreadCount(json.data.count);
      }
    } catch {
      // Silently fail for polling
    }
  }, [credentials]);

  // Fetch notifications list
  const fetchNotifications = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (filter !== 'all') params.set('type', filter);

      const res = await adminFetch(`/notifications?${params}`, credentials);
      if (!res.ok || !mountedRef.current) return;
      const json = await res.json();
      if (mountedRef.current && json.success) {
        const items = json.data.notifications as AdminNotification[];
        setNotifications(prev => append ? [...prev, ...items] : items);
        setHasMore(offset + items.length < json.data.total);
      }
    } catch {
      // Silently fail
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [credentials, filter]);

  // Poll unread count
  useEffect(() => {
    mountedRef.current = true;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, POLL_INTERVAL);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchUnreadCount]);

  // Load notifications when dropdown opens or filter changes
  useEffect(() => {
    if (isOpen) {
      fetchNotifications(0, false);
    }
  }, [isOpen, filter, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Mark single notification as read
  const markAsRead = async (id: number) => {
    try {
      const res = await adminFetch(`/notifications/${id}/read`, credentials, { method: 'PATCH' });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, is_read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch {
      // Silently fail
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAllRead(true);
    try {
      const res = await adminFetch('/notifications/mark-all-read', credentials, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Silently fail
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Load more
  const loadMore = () => {
    fetchNotifications(notifications.length, true);
  };

  // Handle notification click
  const handleNotificationClick = (n: AdminNotification) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.related_user_id && onNavigateToPlayer) {
      onNavigateToPlayer(n.related_user_id);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell icon button */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="relative p-2 rounded-lg hover:bg-white/10 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-telegram-hint" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.span>
        )}
      </button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-[360px] max-h-[480px] bg-telegram-bg border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-telegram-text">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={markingAllRead}
                  className="text-xs text-telegram-link hover:underline disabled:opacity-50 flex items-center gap-1"
                >
                  {markingAllRead ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 px-3 py-2 border-b border-white/10 overflow-x-auto scrollbar-hide">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-2.5 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
                    filter === tab.key
                      ? 'bg-telegram-link text-white'
                      : 'bg-white/5 text-telegram-hint hover:bg-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-telegram-hint" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-telegram-hint">
                  <Bell className="w-8 h-8 mb-2 opacity-40" />
                  <span className="text-sm">No notifications</span>
                </div>
              ) : (
                <>
                  {notifications.map(n => {
                    const Icon = TYPE_ICONS[n.type];
                    const iconColor = TYPE_COLORS[n.type];
                    const borderColor = ACCENT_BORDERS[n.type];

                    return (
                      <motion.button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left px-4 py-3 border-l-2 hover:bg-white/5 transition-colors ${
                          n.is_read
                            ? 'border-l-transparent opacity-60'
                            : borderColor
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm ${n.is_read ? 'text-telegram-hint' : 'text-telegram-text font-medium'}`}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-telegram-hint mt-0.5 truncate">
                                {n.message}
                              </p>
                            )}
                            <p className="text-[10px] text-telegram-hint/60 mt-1">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                          {!n.is_read && (
                            <span className="w-2 h-2 mt-1.5 rounded-full bg-telegram-link flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}

                  {/* Load more */}
                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="w-full py-3 text-xs text-telegram-link hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Load more'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
