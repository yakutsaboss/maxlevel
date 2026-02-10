import { useEffect, useState, useCallback } from 'react';
import { useTelegram, useMainButton } from '@/hooks/useTelegram';
import { usePullToRefresh, PullIndicator } from '@/hooks/usePullToRefresh';
import { apiClient } from '@/api/client';
import { Quest } from '@/types';
import { Target, CheckCircle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { QuestCard } from '@/components/quests/QuestCard';
import { QuestDetailModal } from '@/components/quests/QuestDetailModal';
import { TabButton } from '@/components/quests/TabButton';
import { QuestsSkeleton } from '@/components/quests/QuestsSkeleton';

type QuestTab = 'active' | 'completed';

export function Quests() {
  const { user, haptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [completing, setCompleting] = useState(false);
  const [todayCheckinCount, setTodayCheckinCount] = useState(0);

  const loadTodayCheckins = async () => {
    if (!user?.id) return;
    try {
      const res = await apiClient.getTodayCheckins(user.id);
      if (res.success && res.data) { setTodayCheckinCount(res.data.count); }
    } catch (err) {
      console.error('Failed to load today check-ins:', err);
    }
  };

  const loadQuests = async () => {
    if (!user?.id) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [activeRes, completedRes] = await Promise.all([
        apiClient.getActiveQuests(user.id),
        apiClient.getCompletedQuests(user.id, 50),
      ]);
      if (activeRes.success && activeRes.data) { setActiveQuests(activeRes.data); }
      if (completedRes.success && completedRes.data) { setCompletedQuests(completedRes.data); }
      loadTodayCheckins();
    } catch (error) {
      console.error('Failed to load quests:', error);
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
      console.error('Failed to complete quest:', error);
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

  const currentQuests = activeTab === 'active' ? activeQuests : completedQuests;

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
        {todayCheckinCount > 0 && (
          <div className="flex items-center justify-center gap-1.5 mt-3 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-green-300" />
            <span className="text-white/90 text-xs font-medium">Today: {todayCheckinCount} check-in{todayCheckinCount !== 1 ? 's' : ''}</span>
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <AnimatePresence mode="wait">
          {currentQuests.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              <div className="text-6xl mb-4">{activeTab === 'active' ? '🎯' : '✅'}</div>
              <p className="text-telegram-hint">
                {activeTab === 'active' ? 'No active quests. Check back later!' : 'Complete your first quest to see it here!'}
              </p>
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
