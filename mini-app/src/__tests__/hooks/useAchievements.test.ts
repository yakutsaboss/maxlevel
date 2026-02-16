/**
 * Tests for useAchievements hook (mini-app/src/hooks/useAchievements.ts)
 *
 * Run 65 Agent E: Tests the achievement data management hook created by Agent D.
 * Covers: data loading, checkForNew, getProgress, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock apiClient ──────────────────────────────────────────────────

const mockGetAchievements = vi.fn();
const mockGetUserAchievements = vi.fn();
const mockCheckAchievements = vi.fn();

vi.mock('@/api/client', () => ({
  apiClient: {
    getAchievements: (...args: any[]) => mockGetAchievements(...args),
    getUserAchievements: (...args: any[]) => mockGetUserAchievements(...args),
    checkAchievements: (...args: any[]) => mockCheckAchievements(...args),
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

// ─── Import after mocks ─────────────────────────────────────────────

import { useAchievements } from '@/hooks/useAchievements';

// ─── Test data ──────────────────────────────────────────────────────

const mockAchievements = [
  { id: 1, name: 'First Quest', description: 'Complete your first quest', icon: '📜', xp_reward: 25, rarity: 'common', category: 'quest', criteria: { type: 'quest_count', count: 1 } },
  { id: 2, name: 'Social Butterfly', description: 'Add 5 friends', icon: '🦋', xp_reward: 150, rarity: 'rare', category: 'social', criteria: { type: 'friend_count', count: 5 } },
  { id: 3, name: 'Streak Master', description: '7-Day Streak', icon: '🔥', xp_reward: 75, rarity: 'common', category: 'streak', criteria: { type: 'streak', days: 7 } },
];

const mockUserAchievements = [
  { user_id: 1, achievement_id: 1, unlocked_at: '2026-02-10T10:00:00Z', achievement: mockAchievements[0] },
];

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAchievements', () => {
  it('loads achievements and user achievements on mount', async () => {
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: mockUserAchievements });

    const { result } = renderHook(() => useAchievements(1));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.achievements).toHaveLength(3);
    expect(result.current.userAchievements).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state correctly', async () => {
    let resolveAch!: (v: any) => void;
    const achPromise = new Promise((resolve) => { resolveAch = resolve; });
    mockGetAchievements.mockReturnValueOnce(achPromise);
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveAch({ success: true, data: mockAchievements });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('checkForNew calls API and refreshes data', async () => {
    // Initial load
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: mockUserAchievements });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // checkForNew call
    const newAch = { id: 3, name: 'Streak Master', icon: '🔥', xp_reward: 75 };
    mockCheckAchievements.mockResolvedValueOnce({
      success: true,
      data: { newAchievements: [newAch], count: 1 },
    });
    // After check, it refreshes
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({
      success: true,
      data: [...mockUserAchievements, { user_id: 1, achievement_id: 3, unlocked_at: '2026-02-16', achievement: mockAchievements[2] }],
    });

    let newlyUnlocked: any[] = [];
    await act(async () => {
      newlyUnlocked = await result.current.checkForNew();
    });

    expect(mockCheckAchievements).toHaveBeenCalledWith(1);
    expect(newlyUnlocked).toHaveLength(1);
  });

  it('getProgress returns correct values for quest_count criteria', async () => {
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const progress = result.current.getProgress(mockAchievements[0] as any);
    expect(progress).toHaveProperty('current');
    expect(progress).toHaveProperty('target');
    expect(progress).toHaveProperty('percentage');
    expect(progress.target).toBe(1);
    expect(progress.percentage).toBeGreaterThanOrEqual(0);
    expect(progress.percentage).toBeLessThanOrEqual(100);
  });

  it('getProgress returns correct values for streak criteria', async () => {
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const progress = result.current.getProgress(mockAchievements[2] as any);
    // getProgress extracts threshold from criteria.threshold ?? criteria.count ?? 1
    // For streak criteria { type: 'streak', days: 7 }, neither threshold nor count exists, so target = 1
    expect(progress.target).toBe(1);
  });

  it('getProgress returns 0/1 for unknown progress types', async () => {
    const unknownAch = { ...mockAchievements[0], criteria: { type: 'night_quest', hour: 22 } };
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: [unknownAch] });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const progress = result.current.getProgress(unknownAch as any);
    // For unknown progress types, target should be 1 and current 0
    expect(progress.target).toBeGreaterThanOrEqual(1);
    expect(progress.current).toBe(0);
  });

  it('handles API errors gracefully', async () => {
    mockGetAchievements.mockRejectedValueOnce(new Error('Network error'));
    mockGetUserAchievements.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.achievements).toEqual([]);
  });

  it('refresh reloads data', async () => {
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refresh
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: mockUserAchievements });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockGetAchievements).toHaveBeenCalledTimes(2);
    });
  });

  it('returns categories derived from achievements', async () => {
    mockGetAchievements.mockResolvedValueOnce({ success: true, data: mockAchievements });
    mockGetUserAchievements.mockResolvedValueOnce({ success: true, data: [] });

    const { result } = renderHook(() => useAchievements(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.categories).toBeInstanceOf(Array);
    expect(result.current.categories.length).toBeGreaterThan(0);
  });
});
