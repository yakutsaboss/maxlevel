import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

vi.mock('@/api/client', () => ({
  apiClient: {
    getActiveQuests: vi.fn(),
    getCompletedQuests: vi.fn(),
    completeQuest: vi.fn(),
    getTodayCheckins: vi.fn(),
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

const mockGetActiveQuests = vi.mocked(apiClient.getActiveQuests);
const mockGetCompletedQuests = vi.mocked(apiClient.getCompletedQuests);
const mockCompleteQuest = vi.mocked(apiClient.completeQuest);
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

function setupMocks(
  activeQuests: Quest[] = [],
  completedQuests: Quest[] = [],
) {
  mockGetActiveQuests.mockResolvedValue({ success: true, data: activeQuests } as any);
  mockGetCompletedQuests.mockResolvedValue({ success: true, data: completedQuests } as any);
  mockGetTodayCheckins.mockResolvedValue({ success: true, data: { count: 0 } } as any);
}

describe('useQuestsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    // Never-resolving promises to stay in loading
    mockGetActiveQuests.mockReturnValue(new Promise(() => {}) as any);
    mockGetCompletedQuests.mockReturnValue(new Promise(() => {}) as any);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false);
    expect(result.current.activeQuests).toEqual([]);
    expect(result.current.completedQuests).toEqual([]);
  });

  it('loads quests and checkins on mount', async () => {
    const active = [makeQuest({ id: 1, title: 'Push-ups' }), makeQuest({ id: 2, title: 'Reading' })];
    const completed = [makeQuest({ id: 3, title: 'Old Quest', status: 'completed' })];
    setupMocks(active, completed);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.activeQuests).toHaveLength(2);
    expect(result.current.completedQuests).toHaveLength(1);
    expect(result.current.error).toBe(false);
    expect(mockGetActiveQuests).toHaveBeenCalledWith(123);
    expect(mockGetCompletedQuests).toHaveBeenCalledWith(123, 50);
    expect(mockGetTodayCheckins).toHaveBeenCalledWith(123);
  });

  it('handleCompleteQuest updates state', async () => {
    const quest = makeQuest({ id: 10, progress: 5, target: 5 });
    setupMocks([quest]);
    mockCompleteQuest.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Select the quest first
    act(() => {
      result.current.handleQuestSelect(quest);
    });
    expect(result.current.selectedQuest).toEqual(quest);

    // Complete it
    await act(async () => {
      await result.current.handleCompleteQuest();
    });

    expect(mockCompleteQuest).toHaveBeenCalledWith(10, 5);
    expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    expect(result.current.selectedQuest).toBeNull();
  });

  it('filter by mode works', async () => {
    const fitnessQuest = makeQuest({ id: 1, mode_id: 1, title: 'Fitness Quest', mode: { id: 1, name: 'fitness', display_name: 'Fitness', description: '', icon: '💪', is_active: true } });
    const learningQuest = makeQuest({ id: 2, mode_id: 2, title: 'Learning Quest', mode: { id: 2, name: 'learning', display_name: 'Learning', description: '', icon: '📚', is_active: true } });
    setupMocks([fitnessQuest, learningQuest]);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Initially shows all quests (no mode filter)
    expect(result.current.currentQuests).toHaveLength(2);

    // Filter by mode 1 (fitness)
    act(() => {
      result.current.setSelectedModeId(1);
    });

    expect(result.current.currentQuests).toHaveLength(1);
    expect(result.current.currentQuests[0].title).toBe('Fitness Quest');

    // Reset filter
    act(() => {
      result.current.setSelectedModeId(null);
    });
    expect(result.current.currentQuests).toHaveLength(2);
  });

  it('sort order works', async () => {
    const lowXp = makeQuest({ id: 1, xp_reward: 10, progress: 4, target: 5 });
    const highXp = makeQuest({ id: 2, xp_reward: 100, progress: 1, target: 5 });
    const midXp = makeQuest({ id: 3, xp_reward: 50, progress: 3, target: 5 });
    setupMocks([lowXp, highXp, midXp]);

    const { result } = renderHook(() => useQuestsData(123, mockHaptic));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Default: newest (descending by id)
    expect(result.current.currentQuests.map((q) => q.id)).toEqual([3, 2, 1]);

    // Sort by XP reward
    act(() => {
      result.current.setSortBy('xp_reward');
    });
    expect(result.current.currentQuests.map((q) => q.xp_reward)).toEqual([100, 50, 10]);

    // Sort by progress
    act(() => {
      result.current.setSortBy('progress');
    });
    // progress ratios: lowXp=4/5=0.8, midXp=3/5=0.6, highXp=1/5=0.2
    expect(result.current.currentQuests.map((q) => q.id)).toEqual([1, 3, 2]);
  });
});
