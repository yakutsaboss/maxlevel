import { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '@/api/client';
import { Quest, Mode } from '@/types';
import { SortOption } from '@/components/quests/QuestFilters';
import type { HapticFeedback } from '@/types/telegram';
import { logger } from '@/utils/logger';

type QuestTab = 'active' | 'completed';

export function useQuestsData(userId: number | undefined, haptic: HapticFeedback) {
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
    if (!userId) return;
    try {
      const res = await apiClient.getTodayCheckins(userId);
      if (res.success && res.data) { setTodayCheckinCount(res.data.count); }
    } catch (err) {
      logger.error('Failed to load today check-ins', { error: err });
    }
  };

  const loadQuests = async () => {
    if (!userId) { setLoading(false); return; }
    try {
      setLoading(true);
      setError(false);
      const [activeResult, completedResult] = await Promise.allSettled([
        apiClient.getActiveQuests(userId),
        apiClient.getCompletedQuests(userId, 50),
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

  useEffect(() => { loadQuests(); }, [userId]);

  const handleQuestSelect = useCallback((quest: Quest) => {
    haptic.impact('light');
    setSelectedQuest(quest);
  }, [haptic]);

  const handleCompleteQuest = useCallback(async () => {
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
  }, [selectedQuest, completing, haptic]);

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

  const closeSelectedQuest = useCallback(() => {
    haptic.impact('light');
    setSelectedQuest(null);
  }, [haptic]);

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

  // Main button text and visibility
  const mainButtonText = selectedQuest ? (completing ? 'Completing...' : 'Complete Quest') : '';
  const mainButtonVisible = !!selectedQuest && selectedQuest.progress >= selectedQuest.target;
  const mainButtonActive = !completing;

  return {
    // Tab state
    activeTab,
    setActiveTab,
    // Loading/error
    loading,
    error,
    // Quest data
    activeQuests,
    completedQuests,
    availableModes,
    currentQuests,
    completionStats,
    // Selection
    selectedQuest,
    completing,
    todayCheckinCount,
    // Filters
    selectedModeId,
    setSelectedModeId,
    sortBy,
    setSortBy,
    // Handlers
    handleRefresh,
    handleQuestSelect,
    handleCompleteQuest,
    handleCheckinSuccess,
    closeSelectedQuest,
    loadQuests,
    // Main button config
    mainButtonText,
    mainButtonVisible,
    mainButtonActive,
  };
}
