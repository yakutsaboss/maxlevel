import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram, useMainButton } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Quest, Mode } from '@/types';
import { Target, CheckCircle, Clock, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { QuestCard } from '@/components/quests/QuestCard';
import { QuestDetailModal } from '@/components/quests/QuestDetailModal';
import { TabButton } from '@/components/quests/TabButton';
import { QuestsSkeleton } from '@/components/quests/QuestsSkeleton';
import { QuestFilters, SortOption } from '@/components/quests/QuestFilters';
import { logger } from '@/utils/logger';

type QuestTab = 'active' | 'completed';

export function Quests() {
  const { user, haptic } = useTelegram();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [completing, setCompleting] = useState(false);
  const [todayCheckinCount, setTodayCheckinCount] = useState(0);
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  const loadTodayCheckins = async () => {
    if (!user?.id) return;
    try {
      const res = await apiClient.getTodayCheckins(user.id);
      if (res.success && res.data) { setTodayCheckinCount(res.data.count); }
    } catch (err) {
      logger.error('Failed to load today check-ins', { error: err });
    }
  };

  const loadQuests = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [activeResult, completedResult] = await Promise.allSettled([
        apiClient.getActiveQuests(user.id),
        apiClient.getCompletedQuests(user.id, 50),
      ]);
      if (activeResult.status === 'fulfilled' && activeResult.value.success && activeResult.value.data) {
        setActiveQuests(activeResult.value.data);
      } else if (activeResult.status === 'rejected') {
        logger.error('Failed to load active quests', { error: activeResult.reason });
      }
      if (completedResult.status === 'fulfilled' && completedResult.value.success && completedResult.value.data) {
        setCompletedQuests(completedResult.value.data);
      } else if (completedResult.status === 'rejected') {
        logger.error('Failed to load completed quests', { error: completedResult.reason });
      }
      if (activeResult.status === 'rejected' && completedResult.status === 'rejected') {
        setError(true);
      }
      loadTodayCheckins();
    } catch (error) {
      logger.error('Failed to load quests', { error });
      setError(true);
    } finally { setLoading(false); }
  };

  const handleRefresh = useCallback(async () => { await loadQuests(); }, []);
  const { containerRef, pullDistance, refreshing, pullThreshold, touchHandlers } = usePullToRefresh(handleRefresh, haptic);

  useEffect(() => { loadQuests(); }, [user]);

  const handleQuestSelect = (quest: Quest) => {
    haptic.impact('light');
    setSelectedQuest(quest);
  };

  const handleCompleteQuest = async () => {
    if (!selectedQuest || completing) return;
    try {
      setCompleting(true);
      const response = await apiClient.completeQuest(selectedQuest.id, selectedQuest.target);
      if (response.success) {
        haptic.notification('success');
        await loadQuests();
        setSelectedQuest(null);
      }
    } catch (error) {
      logger.error('Failed to complete quest', { error });
      haptic.notification('error');
    } finally { setCompleting(false); }
  };

  const handleCheckinSuccess = useCallback((result: { completed: boolean; current: number; target: number }) => {
    if (selectedQuest) {
      setSelectedQuest({ ...selectedQuest, progress: result.current, status: result.completed ? 'completed' : selectedQuest.status });
    }
    loadTodayCheckins();
    if (result.completed) {
      haptic.notification('success');
      loadQuests().then(() => setSelectedQuest(null));
    } else {
      loadQuests();
    }
  }, [selectedQuest, haptic]);

  useMainButton(
    selectedQuest ? (completing ? 'Completing...' : 'Complete Quest') : '',
    handleCompleteQuest,
    {
      isVisible: !!selectedQuest && selectedQuest.progress >= selectedQuest.target,
      isActive: !completing,
    }
  );

  // Extract unique modes from all quests
  const availableModes = useMemo(() => {
    const modeMap = new Map<number, Mode>();
    [...activeQuests, ...completedQuests].forEach((q) => {
      if (q.mode) modeMap.set(q.mode.id, q.mode);
    });
    return Array.from(modeMap.values());
  }, [activeQuests, completedQuests]);

  // Filter and sort quests
  const currentQuests = useMemo(() => {
    const source = activeTab === 'active' ? activeQuests : completedQuests;

    const filtered = selectedModeId !== null
      ? source.filter((q) => q.mode_id === selectedModeId)
      : source;

    const sorted = [...filtered];
    switch (sortBy) {
      case 'xp_reward':
        sorted.sort((a, b) => b.xp_reward - a.xp_reward);
        break;
      case 'progress':
        sorted.sort((a, b) => {
          const progressA = a.target > 0 ? a.progress / a.target : 0;
          const progressB = b.target > 0 ? b.progress / b.target : 0;
          return progressB - progressA;
        });
        break;
      case 'newest':
      default:
        sorted.sort((a, b) => b.id - a.id);
        break;
    }

    return sorted;
  }, [activeTab, activeQuests, completedQuests, selectedModeId, sortBy]);

  // Completion stats for progress bar
  const completionStats = useMemo(() => {
    if (activeTab === 'active') {
      const total = activeQuests.length;
      const done = activeQuests.filter((q) => q.progress >= q.target).length;
      return { done, total };
    }
    return { done: completedQuests.length, total: completedQuests.length };
  }, [activeTab, activeQuests, completedQuests]);

  if (loading) {
    return <QuestsSkeleton />;
  }

  if (error) {
    return <ErrorSection message="Could not load your quests" onRetry={loadQuests} />;
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-telegram-bg text-telegram-text pb-20 overflow-y-auto"
      {...touchHandlers}
    >
      <PullIndicator pullDistance={pullDistance} refreshing={refreshing} pullThreshold={pullThreshold} />
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <Target className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Quests</h1>
            <p className="text-purple-100 text-sm">Complete quests to level up</p>
          </div>
        </div>
        <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
          <TabButton active={activeTab === 'active'} onClick={() => { setActiveTab('active'); haptic.selection(); }} icon={<Clock className="w-4 h-4" />} label="Active" count={activeQuests.length} />
          <TabButton active={activeTab === 'completed'} onClick={() => { setActiveTab('completed'); haptic.selection(); }} icon={<CheckCircle className="w-4 h-4" />} label="Completed" count={completedQuests.length} />
        </div>

        {/* Progress summary */}
        <div className="mt-3 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/90 text-xs font-medium">
              {completionStats.done} of {completionStats.total} quests {activeTab === 'active' ? 'ready to claim' : 'completed'}
            </span>
            {todayCheckinCount > 0 && (
              <span className="flex items-center gap-1 text-white/80 text-xs">
                <CheckCircle className="w-3 h-3 text-green-300" />
                {todayCheckinCount} check-in{todayCheckinCount !== 1 ? 's' : ''} today
              </span>
            )}
          </div>
          <div className="bg-white/20 rounded-full h-1.5 overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: completionStats.total > 0 ? `${(completionStats.done / completionStats.total) * 100}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Mode filter chips + sort toggle */}
      {availableModes.length > 0 && (
        <QuestFilters
          modes={availableModes}
          selectedModeId={selectedModeId}
          onModeSelect={setSelectedModeId}
          sortBy={sortBy}
          onSortChange={setSortBy}
          haptic={haptic}
        />
      )}

      <div className={`px-4 ${availableModes.length > 0 ? 'mt-2' : 'mt-6'}`}>
        <AnimatePresence mode="wait">
          {currentQuests.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              {activeTab === 'active' ? (
                <>
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-telegram-text font-semibold text-lg mb-2">No Active Quests</p>
                  <p className="text-telegram-hint text-sm mb-6">
                    {selectedModeId !== null
                      ? 'No quests found for this mode. Try selecting a different filter!'
                      : 'Start your journey by exploring available modes and activating quests!'}
                  </p>
                  {selectedModeId === null && (
                    <button
                      onClick={() => { haptic.impact('light'); navigate('/settings'); }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-2xl shadow-lg active:scale-95 transition-transform"
                    >
                      Explore Modes
                    </button>
                  )}
                </>
              ) : (
                <>
                  <Trophy className="w-16 h-16 text-telegram-hint/40 mx-auto mb-4" />
                  <p className="text-telegram-text font-semibold text-lg mb-2">No Victories Yet</p>
                  <p className="text-telegram-hint text-sm">
                    {selectedModeId !== null
                      ? 'No completed quests for this mode yet.'
                      : 'Your victories will appear here — go crush a quest!'}
                  </p>
                </>
              )}
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              {currentQuests.map((quest, index) => (
                <QuestCard key={quest.id} quest={quest} index={index} isSelected={selectedQuest?.id === quest.id} onClick={() => handleQuestSelect(quest)} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          completing={completing}
          userId={user?.id}
          onClose={() => { haptic.impact('light'); setSelectedQuest(null); }}
          onCheckinSuccess={handleCheckinSuccess}
        />
      )}
    </div>
  );
}
