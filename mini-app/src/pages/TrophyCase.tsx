import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useTrophies } from '@/hooks/useTrophies';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { TrophyCard } from '@/components/trophies/TrophyCard';
import { TrophyDetailModal } from '@/components/trophies/TrophyDetailModal';
import { TrophyCaseSkeleton } from '@/components/trophies/TrophyCaseSkeleton';
import { ErrorSection } from '@/components/ErrorSection';
import { Trophy as TrophyIcon, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Trophy } from '@/api/trophies';

type Tab = 'earned' | 'all';

export function TrophyCase() {
  const { t } = useTranslation();
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const { allTrophies, earnedTrophies, loading, error, checkForNew, refresh } = useTrophies(user?.id);

  const [activeTab, setActiveTab] = useState<Tab>('earned');
  const [selectedTrophy, setSelectedTrophy] = useState<Trophy | null>(null);
  const [checking, setChecking] = useState(false);
  const [newCount, setNewCount] = useState(0);

  // Back button navigates to profile
  useBackButton(useCallback(() => navigate('/profile'), [navigate]));

  // Pull to refresh
  const handleRefresh = useCallback(async () => { await refresh(); }, [refresh]);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  // Earned trophy IDs for quick lookup
  const earnedMap = useMemo(() => {
    const map = new Map<number, typeof earnedTrophies[0]>();
    for (const ut of earnedTrophies) {
      map.set(ut.trophy_id, ut);
    }
    return map;
  }, [earnedTrophies]);

  const earnedCount = earnedTrophies.length;
  const totalCount = allTrophies.length;

  // Filter trophies based on active tab
  const displayedTrophies = useMemo(() => {
    if (activeTab === 'all') return allTrophies;
    return allTrophies.filter((tr) => earnedMap.has(tr.id));
  }, [allTrophies, earnedMap, activeTab]);

  const handleCheckForNew = async () => {
    if (checking) return;
    setChecking(true);
    setNewCount(0);
    haptic.impact('medium');
    try {
      const newOnes = await checkForNew();
      if (newOnes.length > 0) {
        setNewCount(newOnes.length);
        haptic.impact('heavy');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleTrophyTap = (trophy: Trophy) => {
    haptic.impact('light');
    setSelectedTrophy(trophy);
  };

  if (loading) return <TrophyCaseSkeleton />;
  if (error) return <ErrorSection message={t('trophy.couldNotLoad')} onRetry={refresh} />;

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />

      {/* Header */}
      <div className="bg-gradient-to-br from-yellow-500 to-amber-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-3">
          <TrophyIcon className="w-7 h-7 text-white" />
          <h1 className="text-2xl font-bold text-white">{t('trophy.title')}</h1>
        </div>

        {/* Progress bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">{t('trophy.earnedCount', { earned: earnedCount, total: totalCount })}</span>
            <span className="text-white font-bold">
              {totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0}%
            </span>
          </div>
          <div className="bg-white/30 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(earnedCount / totalCount) * 100}%` : '0%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Check for new trophies */}
        <button
          onClick={handleCheckForNew}
          disabled={checking}
          className="w-full mt-3 flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 active:scale-[0.98] backdrop-blur-sm rounded-xl px-4 py-2 text-white text-sm font-medium transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          {checking
            ? t('trophy.checking')
            : newCount > 0
              ? t('trophy.newEarned', { count: newCount })
              : t('trophy.checkForNew')}
        </button>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {(['earned', 'all'] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => { haptic.impact('light'); setActiveTab(tab); }}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-amber-700'
                  : 'bg-white/20 text-white/80 hover:bg-white/30'
              }`}
            >
              {t(`trophy.tab_${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Trophy grid */}
      <div className="px-4 mt-4 grid grid-cols-2 gap-3 mb-6">
        {displayedTrophies.map((trophy, index) => (
          <TrophyCard
            key={trophy.id}
            trophy={trophy}
            earned={earnedMap.get(trophy.id)}
            onTap={handleTrophyTap}
            index={index}
          />
        ))}

        {displayedTrophies.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <TrophyIcon className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">
              {activeTab === 'earned' ? t('trophy.noEarned') : t('trophy.noTrophies')}
            </p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      <TrophyDetailModal
        trophy={selectedTrophy}
        earned={selectedTrophy ? earnedMap.get(selectedTrophy.id) : undefined}
        onClose={() => setSelectedTrophy(null)}
      />
    </div>
  );
}
