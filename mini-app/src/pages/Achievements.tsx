import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Achievement, UserAchievement } from '@/types';
import { Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { RarityGroup } from '@/components/achievements/RarityGroup';
import { AchievementsSkeleton } from '@/components/achievements/AchievementsSkeleton';
import { logger } from '@/utils/logger';

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'] as const;

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All',
  fitness: 'Fitness',
  hydration: 'Hydration',
  finance: 'Finance',
  learning: 'Learning',
  general: 'General',
};

export function Achievements() {
  const { user, haptic } = useTelegram();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [allRes, userRes] = await Promise.all([
        apiClient.getAchievements(),
        apiClient.getUserAchievements(user.id),
      ]);
      if (allRes.success && allRes.data) setAllAchievements(allRes.data);
      if (userRes.success && userRes.data) setUserAchievements(userRes.data);
    } catch (err) {
      logger.error('Failed to load achievements', { error: err });
      setError(true);
    } finally { setLoading(false); }
  };

  const handleRefresh = useCallback(async () => { await loadData(); }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => { loadData(); }, [user]);

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  const categories = useMemo(() => {
    const cats = new Set(allAchievements.map(a => a.category || 'general'));
    return ['all', ...Array.from(cats).sort()];
  }, [allAchievements]);

  const filteredAchievements = selectedCategory === 'all'
    ? allAchievements
    : allAchievements.filter(a => (a.category || 'general') === selectedCategory);

  const grouped = RARITY_ORDER.map(rarity => ({
    rarity,
    achievements: filteredAchievements.filter(a => a.rarity === rarity),
  })).filter(g => g.achievements.length > 0);

  if (loading) return <AchievementsSkeleton />;
  if (error) return <ErrorSection message="Could not load achievements" onRetry={loadData} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-7 h-7 text-white" />
          <h1 className="text-2xl font-bold text-white">Rewards</h1>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">Progress</span>
            <span className="text-white font-bold">{unlockedCount} / {totalCount}</span>
          </div>
          <div className="bg-white/30 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={unlockedCount} aria-valuemin={0} aria-valuemax={totalCount} aria-label={`Achievement progress: ${unlockedCount} of ${totalCount} unlocked`}>
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(unlockedCount / totalCount) * 100}%` : '0%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Category filter */}
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto hide-scrollbar mt-3 -mx-1 px-1" role="tablist" aria-label="Achievement category filter">
            {categories.map(cat => (
              <button
                key={cat}
                role="tab"
                aria-selected={selectedCategory === cat}
                aria-label={`Filter by ${CATEGORY_LABELS[cat] || cat}`}
                onClick={() => { haptic.impact('light'); setSelectedCategory(cat); }}
                className={`shrink-0 py-1.5 px-3 rounded-xl font-medium text-sm transition-all ${
                  selectedCategory === cat
                    ? 'bg-white text-orange-600 shadow-lg'
                    : 'bg-white/20 text-white/70'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Achievement groups by rarity */}
      <div className="px-4 mt-6 space-y-6 mb-6">
        {grouped.map(({ rarity, achievements }) => (
          <RarityGroup
            key={rarity}
            rarity={rarity}
            achievements={achievements}
            unlockedIds={unlockedIds}
            userAchievements={userAchievements}
            haptic={haptic}
          />
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">
              {selectedCategory === 'all' ? 'No achievements available yet' : `No ${CATEGORY_LABELS[selectedCategory] || selectedCategory} achievements`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
