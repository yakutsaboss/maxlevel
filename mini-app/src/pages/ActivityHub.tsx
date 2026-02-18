import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useActivities } from '@/hooks/useActivities';
import type { ActivityCategory } from '@/hooks/useActivities';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { ErrorSection } from '@/components/ErrorSection';
import { Toast } from '@/components/Toast';
import { ActivityCard } from '@/components/activity/ActivityCard';
import { Search, Activity, Flame } from 'lucide-react';

const CATEGORIES: ActivityCategory[] = [
  'all', 'cardio', 'strength', 'flexibility', 'sports', 'outdoor', 'mind-body',
];

function getCategoryLabel(cat: ActivityCategory, t: (key: string) => string): string {
  const map: Record<ActivityCategory, string> = {
    all: t('activityHub.categories.all'),
    cardio: t('activityHub.categories.cardio'),
    strength: t('activityHub.categories.strength'),
    flexibility: t('activityHub.categories.flexibility'),
    sports: t('activityHub.categories.sports'),
    outdoor: t('activityHub.categories.outdoor'),
    'mind-body': t('activityHub.categories.mindBody'),
  };
  return map[cat] || cat;
}

function ActivityHubSkeleton() {
  return (
    <div className="min-h-screen bg-telegram-bg pb-20" role="status" aria-label="Loading activities">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 pt-8 pb-6 px-6 rounded-b-3xl">
        <div className="animate-pulse">
          <div className="bg-white/20 w-32 h-7 rounded-lg mb-4" />
          <div className="bg-white/10 rounded-2xl px-4 py-3 flex gap-4">
            <div className="bg-white/20 w-20 h-10 rounded-lg" />
            <div className="bg-white/20 w-20 h-10 rounded-lg" />
          </div>
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/20 w-20 h-8 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 mt-4 grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-3 h-44 animate-pulse">
            <div className="bg-telegram-hint/20 w-10 h-10 rounded-xl mb-2" />
            <div className="bg-telegram-hint/20 w-full h-4 rounded mb-1" />
            <div className="bg-telegram-hint/20 w-16 h-3 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ActivityHub() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();

  const {
    filteredActivities,
    activitiesThisWeek,
    caloriesBurnedThisWeek,
    loading,
    error,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    quickLog,
    refresh,
  } = useActivities(user?.id);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<'success' | 'error'>('success');
  const [logging, setLogging] = useState<number | null>(null);

  useBackButton(useCallback(() => navigate('/'), [navigate]));

  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  const handleQuickLog = async (activityTypeId: number) => {
    if (logging) return;
    setLogging(activityTypeId);
    haptic.impact('medium');
    try {
      const result = await quickLog(activityTypeId);
      setToastVariant('success');
      setToastMessage(`+${result.xp_awarded} XP`);
      haptic.impact('light');
    } catch (err) {
      setToastVariant('error');
      setToastMessage(err instanceof Error ? err.message : 'Failed to log activity');
    } finally {
      setLogging(null);
    }
  };

  const handleStartTimer = (activityTypeId: number) => {
    haptic.impact('light');
    navigate(`/activity/timer/${activityTypeId}`);
  };

  if (loading) return <ActivityHubSkeleton />;

  if (error) return <ErrorSection message={error} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-7 h-7 text-white" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white">{t('activityHub.title')}</h1>
        </div>

        {/* Stats row */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3 flex gap-4">
          <div className="flex-1">
            <p className="text-white/70 text-xs font-medium">{t('activityHub.thisWeek')}</p>
            <p className="text-white text-xl font-bold">{activitiesThisWeek}</p>
          </div>
          <div className="w-px bg-white/20" />
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-300" aria-hidden="true" />
              <p className="text-white/70 text-xs font-medium">{t('activityHub.caloriesBurned')}</p>
            </div>
            <p className="text-white text-xl font-bold">{caloriesBurnedThisWeek}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('activityHub.searchPlaceholder')}
            className="w-full bg-white/15 text-white placeholder-white/50 text-sm rounded-xl pl-9 pr-4 py-2.5 outline-none focus:bg-white/25 transition-colors"
            aria-label={t('activityHub.searchPlaceholder')}
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none" role="tablist" aria-label="Activity categories">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={category === cat}
              onClick={() => { haptic.impact('light'); setCategory(cat); }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                category === cat
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {getCategoryLabel(cat, t)}
            </button>
          ))}
        </div>
      </div>

      {/* Activity grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3 mb-6">
        {filteredActivities.map((activity, index) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            index={index}
            onQuickLog={handleQuickLog}
            onStartTimer={handleStartTimer}
            logging={logging}
            haptic={haptic}
          />
        ))}

        {/* Empty state */}
        {filteredActivities.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Activity className="w-12 h-12 text-telegram-hint mx-auto mb-3" aria-hidden="true" />
            <p className="text-telegram-hint">{t('activityHub.noActivities')}</p>
          </div>
        )}
      </div>

      {toastMessage && (
        <Toast message={toastMessage} variant={toastVariant} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}
