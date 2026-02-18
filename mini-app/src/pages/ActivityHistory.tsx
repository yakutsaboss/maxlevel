import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
  History,
  Calendar,
  TrendingUp,
  TrendingDown,
  Trophy,
  Flame,
  Timer,
  Dumbbell,
  Footprints,
  Bike,
  Waves,
  Zap,
} from 'lucide-react';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { ActivityCalendar, type DayActivity } from '@/components/activity/ActivityCalendar';
import { logger } from '@/utils/logger';

// --- Types ---

interface ActivityEntry {
  id: number;
  name: string;
  type: string;
  duration: number; // minutes
  calories: number;
  created_at: string;
}

interface WeeklyStats {
  total_activities: number;
  total_duration: number; // minutes
  total_calories: number;
  prev_week_activities: number;
  prev_week_duration: number;
  prev_week_calories: number;
}

interface PersonalRecords {
  longest_duration: number; // minutes
  most_calories: number;
  longest_streak: number; // days
}

interface ActivityHistoryData {
  calendar: DayActivity[];
  weekly: WeeklyStats;
  records: PersonalRecords;
  activities: ActivityEntry[];
  total_count: number;
}

// --- API ---

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchActivityHistory(
  userId: number,
  page: number,
  signal?: AbortSignal,
): Promise<ActivityHistoryData> {
  const initData = window.Telegram?.WebApp?.initData;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (initData) headers['X-Telegram-Init-Data'] = initData;

  const [historyRes, statsRes] = await Promise.all([
    fetch(`${API_BASE_URL}/activities/${userId}/history?page=${page}&limit=15`, { headers, signal }),
    page === 1
      ? fetch(`${API_BASE_URL}/activities/${userId}/stats`, { headers, signal })
      : Promise.resolve(null),
  ]);

  if (!historyRes.ok) throw new Error(`History request failed: ${historyRes.status}`);
  const historyJson = await historyRes.json();

  let statsJson: { data?: { calendar?: DayActivity[]; weekly?: WeeklyStats; records?: PersonalRecords } } = {};
  if (statsRes) {
    if (!statsRes.ok) throw new Error(`Stats request failed: ${statsRes.status}`);
    statsJson = await statsRes.json();
  }

  return {
    calendar: statsJson.data?.calendar ?? [],
    weekly: statsJson.data?.weekly ?? {
      total_activities: 0,
      total_duration: 0,
      total_calories: 0,
      prev_week_activities: 0,
      prev_week_duration: 0,
      prev_week_calories: 0,
    },
    records: statsJson.data?.records ?? {
      longest_duration: 0,
      most_calories: 0,
      longest_streak: 0,
    },
    activities: historyJson.data?.activities ?? [],
    total_count: historyJson.data?.total_count ?? 0,
  };
}

// --- Helpers ---

function getActivityIcon(type: string) {
  switch (type) {
    case 'running':
      return <Footprints className="w-4 h-4 text-blue-400" />;
    case 'cycling':
      return <Bike className="w-4 h-4 text-green-400" />;
    case 'swimming':
      return <Waves className="w-4 h-4 text-cyan-400" />;
    case 'strength':
      return <Dumbbell className="w-4 h-4 text-purple-400" />;
    default:
      return <Zap className="w-4 h-4 text-yellow-400" />;
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function percentChange(current: number, previous: number): { text: string; positive: boolean } | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return { text: '+100%', positive: true };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return null;
  return {
    text: `${pct > 0 ? '+' : ''}${pct}%`,
    positive: pct > 0,
  };
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- Component ---

export function ActivityHistory() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();

  const handleBack = useCallback(() => navigate('/activity'), [navigate]);
  useBackButton(handleBack);

  const [data, setData] = useState<ActivityHistoryData | null>(null);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchActivityHistory(user.id, 1);
      if (!mountedRef.current) return;
      setData(result);
      setActivities(result.activities);
      setTotalCount(result.total_count);
      setPage(1);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load activity history';
      setError(msg);
      logger.error('ActivityHistory loadData error', err as Record<string, unknown>);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const loadMore = useCallback(async () => {
    if (!user?.id || loadingMore) return;
    haptic?.impact('light');
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const result = await fetchActivityHistory(user.id, nextPage);
      if (!mountedRef.current) return;
      setActivities((prev) => [...prev, ...result.activities]);
      setPage(nextPage);
    } catch (err) {
      logger.error('ActivityHistory loadMore error', err as Record<string, unknown>);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [user?.id, page, loadingMore, haptic]);

  const handleRefresh = useCallback(async () => { await loadData(); }, [loadData]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const hasMore = activities.length < totalCount;

  const activityChange = useMemo(() =>
    data ? percentChange(data.weekly.total_activities, data.weekly.prev_week_activities) : null,
  [data]);
  const durationChange = useMemo(() =>
    data ? percentChange(data.weekly.total_duration, data.weekly.prev_week_duration) : null,
  [data]);
  const calorieChange = useMemo(() =>
    data ? percentChange(data.weekly.total_calories, data.weekly.prev_week_calories) : null,
  [data]);

  if (error) {
    return <ErrorSection message={error} onRetry={loadData} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div
        className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 rounded-b-3xl shadow-lg"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.5rem)' }}
      >
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-white/90" />
          <h1 className="text-2xl font-bold text-white">{t('activityHistory.title')}</h1>
        </div>
        <p className="text-emerald-100 text-sm mt-1">{t('activityHistory.weeklyStats')}</p>
      </div>

      <div className="px-4 mt-6 space-y-5">
        {loading ? (
          <SkeletonLoader />
        ) : (
          <>
            {/* Calendar Heatmap */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
            >
              <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-telegram-link" />
                {t('activityHistory.thisMonth')}
              </h3>
              <ActivityCalendar data={data?.calendar ?? []} />
            </motion.div>

            {/* Weekly Summary */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
            >
              <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-telegram-link" />
                {t('activityHistory.weeklyStats')}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <WeeklyStatItem
                  label={t('activityHistory.totalWorkouts')}
                  value={String(data?.weekly.total_activities ?? 0)}
                  change={activityChange}
                />
                <WeeklyStatItem
                  label={t('activityHistory.avgDuration')}
                  value={formatDuration(data?.weekly.total_duration ?? 0)}
                  change={durationChange}
                />
                <WeeklyStatItem
                  label="Calories"
                  value={`${(data?.weekly.total_calories ?? 0).toLocaleString()}`}
                  change={calorieChange}
                />
              </div>
            </motion.div>

            {/* Personal Records */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 }}
              className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
            >
              <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                {t('activityHistory.personalRecords')}
              </h3>
              <div className="space-y-2.5">
                <RecordRow
                  icon={<Timer className="w-4 h-4 text-blue-400" />}
                  label={t('activityHistory.longestRun')}
                  value={formatDuration(data?.records.longest_duration ?? 0)}
                />
                <RecordRow
                  icon={<Flame className="w-4 h-4 text-orange-400" />}
                  label={t('activityHistory.mostCalories')}
                  value={`${(data?.records.most_calories ?? 0).toLocaleString()} cal`}
                />
                <RecordRow
                  icon={<Zap className="w-4 h-4 text-green-400" />}
                  label={t('activityHistory.longestStreak')}
                  value={`${data?.records.longest_streak ?? 0} days`}
                />
              </div>
            </motion.div>

            {/* Activity Log */}
            <div>
              <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
                <Dumbbell className="w-4 h-4 text-telegram-link" />
                {t('activityHistory.title')}
              </h3>

              {activities.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Dumbbell className="w-12 h-12 text-telegram-hint/40 mx-auto mb-4" />
                  <p className="text-telegram-hint text-sm">{t('activityHistory.noActivities')}</p>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  {activities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
                    >
                      <div className="flex gap-3 items-center">
                        <div className="w-9 h-9 rounded-xl bg-telegram-bg flex items-center justify-center flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-telegram-text truncate">{activity.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-telegram-hint">{formatDuration(activity.duration)}</span>
                            <span className="text-[11px] text-telegram-hint">&middot;</span>
                            <span className="text-[11px] text-telegram-hint">{activity.calories} cal</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-telegram-hint flex-shrink-0">
                          {formatDate(activity.created_at)}
                        </span>
                      </div>
                    </motion.div>
                  ))}

                  {hasMore && (
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="w-full py-3 rounded-2xl bg-telegram-secondaryBg text-telegram-link text-sm font-medium border border-telegram-hint/10 disabled:opacity-50"
                    >
                      {loadingMore ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-telegram-link/30 border-t-telegram-link rounded-full animate-spin" />
                          Loading...
                        </span>
                      ) : (
                        t('activityHistory.loadMore')
                      )}
                    </motion.button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Sub-components ---

function WeeklyStatItem({ label, value, change }: {
  label: string;
  value: string;
  change: { text: string; positive: boolean } | null;
}) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-telegram-text">{value}</div>
      <div className="text-[10px] text-telegram-hint mt-0.5">{label}</div>
      {change && (
        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium ${change.positive ? 'text-green-500' : 'text-red-400'}`}>
          {change.positive
            ? <TrendingUp className="w-3 h-3" />
            : <TrendingDown className="w-3 h-3" />
          }
          {change.text}
        </div>
      )}
    </div>
  );
}

function RecordRow({ icon, label, value }: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-telegram-bg flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <span className="text-xs text-telegram-hint">{label}</span>
      </div>
      <span className="text-sm font-semibold text-telegram-text">{value}</span>
    </div>
  );
}

function SkeletonLoader() {
  return (
    <div className="space-y-5">
      {/* Calendar skeleton */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-telegram-hint/20 rounded w-1/3 mb-3" />
        <div className="h-24 bg-telegram-hint/10 rounded" />
      </div>
      {/* Weekly stats skeleton */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-telegram-hint/20 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="h-5 bg-telegram-hint/20 rounded w-2/3 mx-auto" />
              <div className="h-2.5 bg-telegram-hint/10 rounded w-4/5 mx-auto" />
            </div>
          ))}
        </div>
      </div>
      {/* Records skeleton */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
        <div className="h-3 bg-telegram-hint/20 rounded w-1/3 mb-3" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-telegram-hint/20 rounded-xl" />
              <div className="flex-1 h-3 bg-telegram-hint/10 rounded" />
              <div className="w-12 h-3 bg-telegram-hint/20 rounded" />
            </div>
          ))}
        </div>
      </div>
      {/* Activity list skeleton */}
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 animate-pulse">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-telegram-hint/20 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-telegram-hint/20 rounded w-2/3" />
                <div className="h-2.5 bg-telegram-hint/10 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
