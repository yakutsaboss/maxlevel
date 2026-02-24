import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Quest } from '@/types';
import { SortOption } from '@/components/quests/QuestFilters';
import type { HapticFeedback } from '@/types/telegram';
import { logger } from '@/utils/logger';
import {
  useActiveQuests,
  useCompletedQuests,
  useTodayCheckins,
  useCompleteQuestMutation,
  questKeys,
} from './useQuestsQuery';

type QuestTab = 'active' | 'completed';

export function useQuestsData(userId: number | undefined, haptic: HapticFeedback) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<QuestTab>('active');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedModeId, setSelectedModeId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(null);
  const [showQuestCelebration, setShowQuestCelebration] = useState(false);
  const [celebratedQuestName, setCelebratedQuestName] = useState<string | undefined>(undefined);

  // React Query hooks
  const activeQuery = useActiveQuests(userId);
  const completedQuery = useCompletedQuests(userId);
  const checkinsQuery = useTodayCheckins(userId);
  const completeQuestMutation = useCompleteQuestMutation();

  const activeQuests = activeQuery.data ?? [];
  const completedQuests = completedQuery.data ?? [];
  const todayCheckinCount = checkinsQuery.data ?? 0;
  const loading = activeQuery.isLoading || completedQuery.isLoading;
  const error = activeQuery.isError && completedQuery.isError;
  const completing = completeQuestMutation.isPending;

  const handleRefresh = useCallback(async () => {
    if (!userId) return;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: questKeys.active(userId) }),
      queryClient.invalidateQueries({ queryKey: questKeys.completed(userId) }),
      queryClient.invalidateQueries({ queryKey: questKeys.todayCheckins(userId) }),
    ]);
  }, [userId, queryClient]);

  const loadQuests = handleRefresh;

  const handleQuestSelect = useCallback((quest: Quest) => {
    haptic.impact('light');
    setSelectedQuest(quest);
  }, [haptic]);

  const handleCompleteQuest = useCallback(async () => {
    if (!selectedQuest || completing || !userId) return;
    try {
      await completeQuestMutation.mutateAsync({
        questId: selectedQuest.id,
        progress: selectedQuest.target,
        userId,
      });
      haptic.notification('success');
      setSelectedQuest(null);
    } catch (error) {
      logger.error('Failed to complete quest', { error });
      haptic.notification('error');
    }
  }, [selectedQuest, completing, userId, completeQuestMutation, haptic]);

  const handleCheckinSuccess = useCallback((result: { completed: boolean; current: number; target: number }) => {
    if (result.completed) {
      // Quest completed — close modal immediately, show celebration
      const questName = selectedQuest?.title;
      setSelectedQuest(null);
      haptic.notification('success');
      setCelebratedQuestName(questName ?? undefined);
      setShowQuestCelebration(true);
      setTimeout(() => setShowQuestCelebration(false), 3000);
      // Invalidate queries in the background (don't block UI)
      if (userId) {
        queryClient.invalidateQueries({ queryKey: questKeys.active(userId) });
        queryClient.invalidateQueries({ queryKey: questKeys.completed(userId) });
      }
    } else if (selectedQuest) {
      // Normal check-in (not final) — update progress in modal
      setSelectedQuest({ ...selectedQuest, progress: result.current });
    }
    // Checkin count + active quests are already invalidated by useCheckinMutation.onSettled
  }, [selectedQuest, haptic, userId, queryClient]);

  const closeSelectedQuest = useCallback(() => {
    haptic.impact('light');
    setSelectedQuest(null);
  }, [haptic]);

  // Extract unique modes from all quests
  const availableModes = useMemo(() => {
    const modeMap = new Map<number, NonNullable<Quest['mode']>>();
    [...activeQuests, ...completedQuests].forEach((q) => {
      if (q.mode) modeMap.set(q.mode.id, q.mode);
    });
    return Array.from(modeMap.values());
  }, [activeQuests, completedQuests]);

  // Filter and sort quests
  const currentQuests = useMemo(() => {
    const source = activeTab === 'active' ? activeQuests : completedQuests;

    const modeFiltered = selectedModeId !== null
      ? source.filter((q) => q.mode_id === selectedModeId)
      : source;

    const filtered = selectedDifficulty
      ? modeFiltered.filter((q) => q.difficulty === selectedDifficulty)
      : modeFiltered;

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
  }, [activeTab, activeQuests, completedQuests, selectedModeId, selectedDifficulty, sortBy]);

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
    selectedDifficulty,
    setSelectedDifficulty,
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
    // Quest celebration
    showQuestCelebration,
    celebratedQuestName,
  };
}
