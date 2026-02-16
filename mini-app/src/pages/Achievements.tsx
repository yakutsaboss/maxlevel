import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Achievement, UserAchievement } from '@/types';
import { Trophy, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { RarityGroup } from '@/components/achievements/RarityGroup';
import { AchievementsSkeleton } from '@/components/achievements/AchievementsSkeleton';
import { CategoryTabs, getAchievementCategory } from '@/components/achievements/CategoryTabs';
import { logger } from '@/utils/logger';

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'] as const;

const ALL_CATEGORIES = ['all', 'fitness', 'hydration', 'finance', 'learning', 'medication', 'habits', 'social', 'streak', 'xp', 'quest', 'special'];

type FilterMode = 'all' | 'earned' | 'unearned';
type SortMode = 'rarity' | 'progress' | 'recent';

export function Achievements() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [sortMode, setSortMode] = useState<SortMode>('rarity');
  const [showControls, setShowControls] = useState(false);

  const loadData = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [allRes, userRes] = await Promise.all([
        apiClient.getAchievements(),
        apiClient.getUserAchievements(user.id),
      ]);
      if (allRes.success && Array.isArray(allRes.data)) setAllAchievements(allRes.data);
      if (userRes.success && Array.isArray(userRes.data)) setUserAchievements(userRes.data);
    } catch (err) {
      logger.error('Failed to load achievements', { error: err });
      setError(true);
    } finally { setLoading(false); }
  };

  const checkForNew = async () => {
    if (!user?.id || checking) return;
    try {
      setChecking(true);
      setNewCount(0);
      haptic.impact('medium');
      const res = await apiClient.checkAchievements(user.id);
      const count = res.data?.count ?? 0;
      if (res.success && count > 0) {
        setNewCount(count);
        haptic.impact('heavy');
        await loadData();
      }
    } catch (err) {
      logger.error('Failed to check achievements', { error: err });
    } finally { setChecking(false); }
  };

  const handleRefresh = useCallback(async () => { await loadData(); }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => { loadData(); }, [user]);

  const unlockedIds = useMemo(() => new Set(userAchievements.map(ua => ua.achievement_id)), [userAchievements]);
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  // Map achievements to derived categories using criteria
  const achievementCategories = useMemo(() => {
    const map = new Map<number, string>();
    for (const ach of allAchievements) {
      map.set(ach.id, getAchievementCategory(ach.criteria));
    }
    return map;
  }, [allAchievements]);

  // Determine which categories have achievements
  const categories = useMemo(() => {
    const presentCats = new Set(achievementCategories.values());
    return ALL_CATEGORIES.filter(cat => cat === 'all' || presentCats.has(cat));
  }, [achievementCategories]);

  // Counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, { earned: number; total: number }> = {};
    let totalEarned = 0;
    let totalAll = 0;

    for (const ach of allAchievements) {
      const cat = achievementCategories.get(ach.id) || 'general';
      if (!counts[cat]) counts[cat] = { earned: 0, total: 0 };
      counts[cat].total++;
      totalAll++;
      if (unlockedIds.has(ach.id)) {
        counts[cat].earned++;
        totalEarned++;
      }
    }
    counts.all = { earned: totalEarned, total: totalAll };
    return counts;
  }, [allAchievements, achievementCategories, unlockedIds]);

  // Filter by category
  const categoryFiltered = useMemo(() => {
    if (selectedCategory === 'all') return allAchievements;
    return allAchievements.filter(a => achievementCategories.get(a.id) === selectedCategory);
  }, [allAchievements, selectedCategory, achievementCategories]);

  // Filter by earned/unearned
  const statusFiltered = useMemo(() => {
    if (filterMode === 'all') return categoryFiltered;
    if (filterMode === 'earned') return categoryFiltered.filter(a => unlockedIds.has(a.id));
    return categoryFiltered.filter(a => !unlockedIds.has(a.id));
  }, [categoryFiltered, filterMode, unlockedIds]);

  // Sort
  const sortedAchievements = useMemo(() => {
    const arr = [...statusFiltered];
    if (sortMode === 'rarity') {
      // default: group by rarity handled by RarityGroup below
      return arr;
    }
    if (sortMode === 'progress') {
      // Earned first, then unearned
      return arr.sort((a, b) => {
        const aUnlocked = unlockedIds.has(a.id) ? 1 : 0;
        const bUnlocked = unlockedIds.has(b.id) ? 1 : 0;
        return bUnlocked - aUnlocked;
      });
    }
    if (sortMode === 'recent') {
      // Recently unlocked first
      return arr.sort((a, b) => {
        const aUa = userAchievements.find(ua => ua.achievement_id === a.id);
        const bUa = userAchievements.find(ua => ua.achievement_id === b.id);
        const aTime = aUa ? new Date(aUa.unlocked_at).getTime() : 0;
        const bTime = bUa ? new Date(bUa.unlocked_at).getTime() : 0;
        return bTime - aTime;
      });
    }
    return arr;
  }, [statusFiltered, sortMode, unlockedIds, userAchievements]);

  // Group by rarity (only used in rarity sort mode)
  const grouped = useMemo(() => {
    if (sortMode !== 'rarity') {
      // Single flat group for non-rarity sorts
      return sortedAchievements.length > 0
        ? [{ rarity: 'all' as string, achievements: sortedAchievements }]
        : [];
    }
    return RARITY_ORDER.map(rarity => ({
      rarity: rarity as string,
      achievements: sortedAchievements.filter(a => a.rarity === rarity),
    })).filter(g => g.achievements.length > 0);
  }, [sortedAchievements, sortMode]);

  if (loading) return <AchievementsSkeleton />;
  if (error) return <ErrorSection message={t('achievements.couldNotLoad')} onRetry={loadData} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-7 h-7 text-white" />
          <h1 className="text-2xl font-bold text-white">{t('achievements.rewards')}</h1>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">{t('achievements.progress')}</span>
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

        {/* Check for new achievements */}
        <button
          onClick={checkForNew}
          disabled={checking}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:scale-[0.98] backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking ? t('achievements.checking') : newCount > 0 ? t('achievements.newUnlocked', { count: newCount }) : t('achievements.checkForNewAchievements')}
        </button>

        {/* Category tabs */}
        <CategoryTabs
          categories={categories}
          activeCategory={selectedCategory}
          onSelect={setSelectedCategory}
          counts={categoryCounts}
          haptic={haptic}
        />
      </div>

      {/* Filter/sort controls */}
      <div className="px-4 mt-4">
        <button
          onClick={() => {
            haptic.impact('light');
            setShowControls(prev => !prev);
          }}
          className="flex items-center gap-1.5 text-sm text-telegram-link font-medium mb-2"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {t('achievements.filterSort')}
        </button>

        {showControls && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="overflow-hidden mb-3"
          >
            {/* Filter toggles */}
            <div className="flex gap-2 mb-2">
              {(['all', 'earned', 'unearned'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { haptic.impact('light'); setFilterMode(mode); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    filterMode === mode
                      ? 'bg-telegram-link text-white'
                      : 'bg-telegram-secondaryBg text-telegram-hint'
                  }`}
                >
                  {t(`achievements.filter_${mode}`)}
                </button>
              ))}
            </div>

            {/* Sort options */}
            <div className="flex gap-2">
              {(['rarity', 'progress', 'recent'] as SortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => { haptic.impact('light'); setSortMode(mode); }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    sortMode === mode
                      ? 'bg-telegram-link text-white'
                      : 'bg-telegram-secondaryBg text-telegram-hint'
                  }`}
                >
                  {t(`achievements.sort_${mode}`)}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Achievement groups */}
      <div className="px-4 mt-2 space-y-6 mb-6">
        {grouped.map(({ rarity, achievements }) => (
          <RarityGroup
            key={rarity}
            rarity={rarity}
            achievements={achievements}
            unlockedIds={unlockedIds}
            userAchievements={userAchievements}
            haptic={haptic}
            hideHeader={sortMode !== 'rarity'}
          />
        ))}

        {grouped.length === 0 && (
          <div className="text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">
              {selectedCategory === 'all' ? t('achievements.noAchievements') : t('achievements.noCategoryAchievements', { category: selectedCategory })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
