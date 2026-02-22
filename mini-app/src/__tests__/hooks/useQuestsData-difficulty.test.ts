/**
 * Tests for difficulty filter in useQuestsData hook (Run 57).
 *
 * Verifies that the selectedDifficulty state and filtering logic
 * added by Agent C correctly filter quests by difficulty level.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/api/client', () => ({
  apiClient: {
    getActiveQuests: vi.fn(),
    getCompletedQuests: vi.fn(),
    completeQuest: vi.fn(),
    getTodayCheckins: vi.fn(),
    createCheckin: vi.fn(),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

import { apiClient } from '@/api/client';
import { useQuestsData } from '@/hooks/useQuestsData';
import type { Quest } from '@/types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

const mockGetActiveQuests = vi.mocked(apiClient.getActiveQuests);
const mockGetCompletedQuests = vi.mocked(apiClient.getCompletedQuests);
const mockGetTodayCheckins = vi.mocked(apiClient.getTodayCheckins);

const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};

const makeQuest = (overrides: Partial<Quest> = {}): Quest => ({
  id: 1,
  user_id: 1,
  mode_id: 1,
  title: 'Test Quest',
  description: 'A test quest',
  xp_reward: 50,
  frequency: 'daily',
  difficulty: 'easy',
  status: 'active',
  progress: 0,
  target: 5,
  mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
  ...overrides,
});

function setupMocks(activeQuests: Quest[] = [], completedQuests: Quest[] = []) {
  mockGetActiveQuests.mockResolvedValue({ success: true, data: activeQuests } as any);
  mockGetCompletedQuests.mockResolvedValue({ success: true, data: completedQuests } as any);
  mockGetTodayCheckins.mockResolvedValue({ success: true, data: { count: 0 } } as any);
}

describe('useQuestsData — difficulty filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const easyQuest = makeQuest({ id: 1, difficulty: 'easy', title: 'Easy Quest', xp_reward: 20 });
  const mediumQuest = makeQuest({ id: 2, difficulty: 'medium', title: 'Medium Quest', xp_reward: 50 });
  const hardQuest = makeQuest({ id: 3, difficulty: 'hard', title: 'Hard Quest', xp_reward: 100 });
  const allQuests = [easyQuest, mediumQuest, hardQuest];

  it('selectedDifficulty should be null initially (shows all quests)', async () => {
    setupMocks(allQuests);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.selectedDifficulty).toBeNull();
    expect(result.current.currentQuests).toHaveLength(3);
  });

  it('should filter by easy difficulty', async () => {
    setupMocks(allQuests);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedDifficulty('easy');
    });

    expect(result.current.selectedDifficulty).toBe('easy');
    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Easy Quest');
  });

  it('should filter by medium difficulty', async () => {
    setupMocks(allQuests);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedDifficulty('medium');
    });

    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Medium Quest');
  });

  it('should filter by hard difficulty', async () => {
    setupMocks(allQuests);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedDifficulty('hard');
    });

    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Hard Quest');
  });

  it('should show all quests when difficulty is reset to null', async () => {
    setupMocks(allQuests);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Filter by easy first
    act(() => {
      result.current.setSelectedDifficulty('easy');
    });
    expect(result.current.currentQuests).toHaveLength(1);

    // Reset to null
    act(() => {
      result.current.setSelectedDifficulty(null);
    });
    expect(result.current.currentQuests).toHaveLength(3);
  });

  it('should combine mode filter and difficulty filter', async () => {
    const fitnessEasy = makeQuest({
      id: 1, mode_id: 1, difficulty: 'easy', title: 'Fitness Easy',
      mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
    });
    const fitnessHard = makeQuest({
      id: 2, mode_id: 1, difficulty: 'hard', title: 'Fitness Hard',
      mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true },
    });
    const learningEasy = makeQuest({
      id: 3, mode_id: 2, difficulty: 'easy', title: 'Learning Easy',
      mode: { id: 2, name: 'learning', display_name: 'Learning', description: '', icon: '📚', is_active: true },
    });

    setupMocks([fitnessEasy, fitnessHard, learningEasy]);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Filter by fitness mode only
    act(() => {
      result.current.setSelectedModeId(1);
    });
    expect(result.current.currentQuests).toHaveLength(2);

    // Add difficulty filter: easy
    act(() => {
      result.current.setSelectedDifficulty('easy');
    });
    // Should show only Fitness Easy (mode=1 AND difficulty=easy)
    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Fitness Easy');
  });

  it('should return empty array when no quests match the difficulty', async () => {
    // Only easy and medium quests
    setupMocks([easyQuest, mediumQuest]);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSelectedDifficulty('hard');
    });

    expect(result.current.currentQuests).toHaveLength(0);
  });

  it('should preserve difficulty filter across tab switches', async () => {
    const completedEasy = makeQuest({ id: 10, difficulty: 'easy', status: 'completed', title: 'Done Easy' });
    const completedHard = makeQuest({ id: 11, difficulty: 'hard', status: 'completed', title: 'Done Hard' });
    setupMocks(allQuests, [completedEasy, completedHard]);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set difficulty filter on active tab
    act(() => {
      result.current.setSelectedDifficulty('easy');
    });
    expect(result.current.currentQuests).toHaveLength(1);

    // Switch to completed tab — filter should still apply
    act(() => {
      result.current.setActiveTab('completed');
    });
    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Done Easy');
  });
});
