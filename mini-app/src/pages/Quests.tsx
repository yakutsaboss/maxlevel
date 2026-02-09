import { useEffect, useState, useRef, useCallback } from 'react';
import { useTelegram, useMainButton } from '@/hooks/useTelegram';
import { apiClient } from '@/api/client';
import { Quest } from '@/types';
import { Target, Zap, CheckCircle, Clock, AlertCircle, RefreshCw, Loader2, Plus, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckInButton } from '@/components/CheckInButton';

type QuestTab = 'active' | 'completed';

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateStr));
}

export function Quests() {
  const { user, haptic } = useTelegram();
  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [activeQuests, setActiveQuests] = useState<Quest[]>([]);
  const [completedQuests, setCompletedQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [completing, setCompleting] = useState(false);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [todayCheckinCount, setTodayCheckinCount] = useState(0);
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
      await loadQuests();
      setRefreshing(false);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, haptic]);

  useEffect(() => { loadQuests(); }, [user]);

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

  const handleUpdateProgress = async (amount: number) => {
    if (!selectedQuest || updatingProgress) return;
    const newProgress = Math.min(selectedQuest.progress + amount, selectedQuest.target);
    if (newProgress === selectedQuest.progress) return;
    try {
      setUpdatingProgress(true);
      const response = await apiClient.updateQuestProgress(selectedQuest.id, newProgress);
      if (response.success) {
        haptic.impact('light');
        setSelectedQuest({ ...selectedQuest, progress: newProgress });
        await loadQuests();
      }
    } catch (err) {
      console.error('Failed to update progress:', err);
      haptic.notification('error');
    } finally {
      setUpdatingProgress(false);
    }
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
    return (
      <div className="min-h-screen bg-telegram-bg pb-20">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="skeleton w-14 h-14 rounded-2xl" />
            <div>
              <div className="skeleton h-7 w-24 rounded-lg mb-2" />
              <div className="skeleton h-4 w-40 rounded-lg" />
            </div>
          </div>
          <div className="skeleton h-10 w-full rounded-2xl" />
        </div>
        <div className="px-4 mt-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="skeleton-text h-5 w-3/4 mb-2">&nbsp;</div>
                  <div className="skeleton-text h-3 w-full">&nbsp;</div>
                </div>
                <div className="skeleton w-16 h-7 rounded-lg ml-3" />
              </div>
              <div className="skeleton h-2 w-full rounded-full mb-3" />
              <div className="flex gap-2">
                <div className="skeleton h-6 w-14 rounded-full" />
                <div className="skeleton h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
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
          <p className="text-sm text-red-500 mb-4">Could not load your quests</p>
          <button onClick={() => { haptic.impact('light'); loadQuests(); }} className="inline-flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-medium active:scale-95 transition-transform">
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
      <div className={`pull-indicator ${refreshing ? 'active refreshing' : ''}`} style={{ height: refreshing ? 48 : pullDistance > 10 ? pullDistance : 0 }}>
        <RefreshCw className={`w-5 h-5 text-telegram-hint ${pullDistance >= PULL_THRESHOLD ? 'text-telegram-link' : ''}`} />
      </div>
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-b-3xl shadow-lg">
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

      <AnimatePresence>
        {selectedQuest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end" onClick={() => { haptic.impact('light'); setSelectedQuest(null); }}>
            <motion.div
              layoutId={`quest-${selectedQuest.id}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="bg-telegram-secondaryBg rounded-t-3xl w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-telegram-hint/30 rounded-full mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-1">{selectedQuest.title}</h2>
              <p className="text-telegram-hint text-sm mb-4">{selectedQuest.description}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-xl text-sm font-semibold">
                  <Zap className="w-4 h-4" />{selectedQuest.xp_reward} XP
                </span>
                <span className={`px-3 py-1.5 rounded-xl text-sm font-semibold ${
                  selectedQuest.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  selectedQuest.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {selectedQuest.difficulty.charAt(0).toUpperCase() + selectedQuest.difficulty.slice(1)}
                </span>
                <span className="bg-telegram-hint/20 text-telegram-hint px-3 py-1.5 rounded-xl text-sm">
                  {selectedQuest.frequency}
                </span>
                {selectedQuest.mode && (
                  <span className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-xl text-sm">
                    {selectedQuest.mode.icon} {selectedQuest.mode.display_name}
                  </span>
                )}
              </div>

              {selectedQuest.due_date && (
                <div className="flex items-center gap-2 text-sm text-telegram-hint mb-4">
                  <Calendar className="w-4 h-4" />
                  <span>Due {formatDate(selectedQuest.due_date)}</span>
                </div>
              )}

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-telegram-hint">Progress</span>
                  <span className="font-semibold">{selectedQuest.progress} / {selectedQuest.target}</span>
                </div>
                <div className="bg-telegram-hint/20 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className={`h-full ${selectedQuest.progress >= selectedQuest.target ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedQuest.progress / selectedQuest.target) * 100}%` }}
                  />
                </div>
              </div>

              {selectedQuest.status === 'active' && selectedQuest.progress < selectedQuest.target && user?.id && (
                <div className="mb-4">
                  <CheckInButton
                    questInstanceId={selectedQuest.id}
                    telegramId={user.id}
                    onSuccess={handleCheckinSuccess}
                    disabled={completing}
                  />
                </div>
              )}

              {selectedQuest.target > 1 && selectedQuest.progress < selectedQuest.target && selectedQuest.status === 'active' && (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-sm text-telegram-hint">Update Progress</span>
                  <div className="flex gap-2 ml-auto">
                    <button
                      onClick={() => { haptic.impact('light'); handleUpdateProgress(1); }}
                      disabled={updatingProgress || selectedQuest.progress >= selectedQuest.target}
                      className="flex items-center gap-1 bg-telegram-link text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                    >
                      {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}+1
                    </button>
                    {selectedQuest.target >= 5 && (
                      <button
                        onClick={() => { haptic.impact('light'); handleUpdateProgress(5); }}
                        disabled={updatingProgress || selectedQuest.progress >= selectedQuest.target}
                        className="flex items-center gap-1 bg-telegram-link text-white px-3 py-2 rounded-xl text-sm font-medium disabled:opacity-50 active:scale-95 transition-transform"
                      >
                        {updatingProgress ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}+5
                      </button>
                    )}
                  </div>
                </div>
              )}

              {selectedQuest.progress >= selectedQuest.target && (
                <div className="bg-green-100 border border-green-300 rounded-2xl p-4 text-center">
                  {completing ? (
                    <Loader2 className="w-8 h-8 text-green-600 mx-auto mb-2 animate-spin" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  )}
                  <p className="text-green-800 font-semibold">{completing ? 'Completing...' : 'Quest Complete!'}</p>
                  <p className="text-green-600 text-sm">{completing ? 'Please wait' : 'Tap the button below to claim your reward'}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium transition-all ${active ? 'bg-white text-blue-600 shadow-lg' : 'text-white/70 hover:text-white'}`}>
      {icon}<span>{label}</span>
      <span className={`text-xs px-2 py-0.5 rounded-full ${active ? 'bg-blue-100' : 'bg-white/20'}`}>{count}</span>
    </button>
  );
}

function QuestCard({ quest, index, isSelected, onClick }: { quest: Quest; index: number; isSelected: boolean; onClick: () => void }) {
  const progress = (quest.progress / quest.target) * 100;
  const isComplete = quest.status === 'completed';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={onClick}
      className={`bg-telegram-secondaryBg rounded-2xl p-4 border-2 transition-all ${isSelected ? 'border-telegram-link shadow-lg' : 'border-transparent'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-telegram-text mb-1 truncate">{quest.title}</h3>
          <p className="text-sm text-telegram-hint line-clamp-2">{quest.description}</p>
        </div>
        <div className="ml-3 flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1 bg-yellow-100 px-2 py-1 rounded-lg">
            <Zap className="w-4 h-4 text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">{quest.xp_reward}</span>
          </div>
          {isComplete && <CheckCircle className="w-5 h-5 text-green-500" />}
        </div>
      </div>
      {!isComplete && (
        <div className="mb-3">
          <div className="flex justify-between text-xs text-telegram-hint mb-1">
            <span>Progress</span><span>{quest.progress} / {quest.target}</span>
          </div>
          <div className="bg-telegram-hint/20 rounded-full h-2 overflow-hidden">
            <motion.div className={`h-full ${progress === 100 ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'}`} initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 0.5, delay: index * 0.05 }} />
          </div>
        </div>
      )}
      {isComplete && quest.completed_at && (
        <div className="text-xs text-telegram-hint mb-3">Completed {formatDate(quest.completed_at)}</div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs px-2 py-1 rounded-full ${quest.difficulty === 'easy' ? 'bg-green-100 text-green-700' : quest.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{quest.difficulty}</span>
        <span className="text-xs px-2 py-1 rounded-full bg-telegram-hint/20 text-telegram-hint">{quest.frequency}</span>
        {quest.mode && (
          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">{quest.mode.icon} {quest.mode.display_name}</span>
        )}
      </div>
    </motion.div>
  );
}

