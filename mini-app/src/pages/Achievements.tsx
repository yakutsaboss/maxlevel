import { useEffect, useState, useRef, useCallback } from 'react';
import { useTelegram } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { Achievement, UserAchievement } from '@/types';
import { Trophy, AlertCircle, RefreshCw, Star, Lock, CheckCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary'] as const;

const RARITY_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  common: { border: 'border-gray-300', bg: 'bg-gray-100', text: 'text-gray-600', label: 'Common' },
  rare: { border: 'border-blue-300', bg: 'bg-blue-50', text: 'text-blue-600', label: 'Rare' },
  epic: { border: 'border-purple-300', bg: 'bg-purple-50', text: 'text-purple-600', label: 'Epic' },
  legendary: { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-600', label: 'Legendary' },
};

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(dateStr));
}

function isRecentlyUnlocked(unlockedAt: string): boolean {
  const unlockTime = new Date(unlockedAt).getTime();
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return unlockTime > oneDayAgo;
}

export function Achievements() {
  const { user, haptic } = useTelegram();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 60;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current) return;
    const distance = Math.max(0, e.touches[0].clientY - touchStartY.current);
    setPullDistance(Math.min(distance * 0.5, 80));
  }, []);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current) return;
    isPulling.current = false;
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      haptic.impact('medium');
      setRefreshing(true);
      setPullDistance(0);
      await loadData();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, haptic]);

  useEffect(() => { loadData(); }, [user]);

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
      console.error('Failed to load achievements:', err);
      setError(true);
    } finally { setLoading(false); }
  };

  const unlockedIds = new Set(userAchievements.map(ua => ua.achievement_id));
  const unlockedCount = userAchievements.length;
  const totalCount = allAchievements.length;

  // Group by rarity
  const grouped = RARITY_ORDER.map(rarity => ({
    rarity,
    achievements: allAchievements.filter(a => a.rarity === rarity),
  })).filter(g => g.achievements.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-b-3xl">
          <div className="skeleton h-7 w-40 rounded-lg mb-2" />
          <div className="skeleton h-4 w-28 rounded-lg" />
        </div>
        <div className="px-4 mt-6">
          <div className="skeleton h-6 w-36 rounded-lg mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
                <div className="skeleton w-12 h-12 rounded-xl mx-auto mb-3" />
                <div className="skeleton-text h-4 w-20 mx-auto mb-2">&nbsp;</div>
                <div className="skeleton-text h-3 w-full">&nbsp;</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-sm w-full">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">Something went wrong</h3>
          <p className="text-sm text-red-500 mb-4">Could not load achievements</p>
          <button
            onClick={() => { haptic.impact('light'); loadData(); }}
            className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform"
          >
            <RefreshCw className="w-4 h-4" />Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      <div
        className={`pull-indicator ${pullDistance > 0 ? 'active' : ''} ${refreshing ? 'refreshing' : ''}`}
        style={{ height: pullDistance > 0 ? pullDistance : refreshing ? 48 : 0 }}
      >
        <RefreshCw className="w-5 h-5 text-telegram-hint" />
      </div>

      {/* Header */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <Trophy className="w-7 h-7 text-white" />
          <h1 className="text-2xl font-bold text-white">Achievements</h1>
        </div>
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-white/90 text-sm font-medium">Progress</span>
            <span className="text-white font-bold">{unlockedCount} / {totalCount}</span>
          </div>
          <div className="bg-white/30 rounded-full h-2.5 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: totalCount > 0 ? `${(unlockedCount / totalCount) * 100}%` : '0%' }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Achievement groups by rarity */}
      <div className="px-4 mt-6 space-y-6 mb-6">
        {grouped.map(({ rarity, achievements: achs }) => {
          const rarityStyle = RARITY_COLORS[rarity] || RARITY_COLORS.common;
          const unlockedInGroup = achs.filter(a => unlockedIds.has(a.id)).length;

          return (
            <div key={rarity}>
              <div className="flex items-center justify-between mb-3">
                <h2 className={`text-lg font-semibold ${rarityStyle.text}`}>
                  {rarityStyle.label}
                </h2>
                <span className="text-xs text-telegram-hint">
                  {unlockedInGroup}/{achs.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {achs.map((ach, index) => {
                  const isUnlocked = unlockedIds.has(ach.id);
                  const userAch = userAchievements.find(ua => ua.achievement_id === ach.id);
                  const isNew = isUnlocked && userAch && isRecentlyUnlocked(userAch.unlocked_at);

                  return (
                    <motion.div
                      key={ach.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.03, type: 'spring', stiffness: 200 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => haptic.impact('light')}
                      className={`rounded-2xl p-4 border relative ${
                        isUnlocked
                          ? `bg-telegram-secondaryBg ${rarityStyle.border}`
                          : 'bg-telegram-secondaryBg/60 border-telegram-hint/10 opacity-60'
                      } ${isNew ? 'achievement-new' : ''}`}
                    >
                      {isNew && (
                        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm z-10">
                          NEW
                        </div>
                      )}
                      {isUnlocked && (
                        <div className="absolute -top-1.5 -right-1.5 bg-green-500 rounded-full p-0.5 shadow-sm">
                          <CheckCircle className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {!isUnlocked && (
                        <div className="absolute -top-1.5 -right-1.5 bg-telegram-hint/50 rounded-full p-0.5">
                          <Lock className="w-4 h-4 text-white" />
                        </div>
                      )}

                      <div className={`text-4xl text-center mb-2 ${!isUnlocked ? 'grayscale opacity-50' : ''}`}>
                        {isUnlocked ? ach.icon : '?'}
                      </div>
                      <h3 className="text-sm font-semibold text-center line-clamp-2 mb-1">
                        {isUnlocked ? ach.name : '???'}
                      </h3>
                      {isUnlocked ? (
                        <>
                          <p className="text-xs text-telegram-hint text-center line-clamp-2 mb-2">
                            {ach.description}
                          </p>
                          <div className="flex items-center justify-center gap-1">
                            <Zap className="w-3.5 h-3.5 text-yellow-500" />
                            <span className="text-xs font-semibold text-yellow-600">+{ach.xp_reward} XP</span>
                          </div>
                          {userAch && (
                            <p className="text-[10px] text-telegram-hint text-center mt-1">
                              {formatDate(userAch.unlocked_at)}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Star className="w-3 h-3 text-telegram-hint" />
                          <span className="text-xs text-telegram-hint">{ach.xp_reward} XP</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {allAchievements.length === 0 && (
          <div className="text-center py-12 bg-telegram-secondaryBg rounded-2xl border border-telegram-hint/10">
            <Trophy className="w-12 h-12 text-telegram-hint mx-auto mb-3" />
            <p className="text-telegram-hint">No achievements available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
