/**
 * Tests for useTrophies hook (mini-app/src/hooks/useTrophies.ts)
 *
 * Run 67 Agent E: Tests the trophy data management hook created by Agent C.
 * Covers: data loading, checkForNew, refresh, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock trophy API functions ──────────────────────────────────────

const mockFetchAllTrophies = vi.fn();
const mockFetchUserTrophies = vi.fn();
const mockCheckTrophies = vi.fn();

vi.mock('@/api/trophies', () => ({
  fetchAllTrophies: (...args: any[]) => mockFetchAllTrophies(...args),
  fetchUserTrophies: (...args: any[]) => mockFetchUserTrophies(...args),
  checkTrophies: (...args: any[]) => mockCheckTrophies(...args),
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Import after mocks ────────────────────────────────────────────

import { useTrophies } from '@/hooks/useTrophies';

// ─── Test data ──────────────────────────────────────────────────────

const mockAllTrophies = [
  { id: 1, name: 'First Steps', description: 'Complete 1 quest', icon_emoji: '🏆', rarity: 'common', criteria: { type: 'quest_count', threshold: 1 }, sort_order: 1 },
  { id: 2, name: 'Getting Started', description: 'Reach level 2', icon_emoji: '🥇', rarity: 'common', criteria: { type: 'level', threshold: 2 }, sort_order: 2 },
  { id: 3, name: 'Week Warrior', description: '7-day streak', icon_emoji: '⚔️', rarity: 'rare', criteria: { type: 'streak_days', threshold: 7 }, sort_order: 4 },
];

const mockEarnedTrophies = [
  { id: 1, user_id: 1, trophy_id: 1, earned_at: '2026-02-10T10:00:00Z', trophy: mockAllTrophies[0] },
];

// ─── Tests ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useTrophies', () => {
  it('loads all trophies and user trophies on mount', async () => {
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);
    // checkForNew is called automatically on mount per spec
    mockCheckTrophies.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTrophies(1));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allTrophies).toHaveLength(3);
    expect(result.current.earnedTrophies).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state correctly', async () => {
    let resolveAll!: (v: any) => void;
    const allPromise = new Promise((resolve) => { resolveAll = resolve; });
    mockFetchAllTrophies.mockReturnValueOnce(allPromise);
    mockFetchUserTrophies.mockResolvedValueOnce([]);
    mockCheckTrophies.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTrophies(1));

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveAll(mockAllTrophies);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('checkForNew calls check endpoint and refreshes data', async () => {
    // Initial load
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);
    mockCheckTrophies.mockResolvedValueOnce([]); // auto-check on mount

    const { result } = renderHook(() => useTrophies(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Manual checkForNew call — the check endpoint returns Trophy objects with name, icon, etc.
    const newTrophy = { id: 2, name: 'Getting Started', icon_emoji: '🥇', rarity: 'common', earned_at: '2026-02-16T00:00:00Z' };
    mockCheckTrophies.mockResolvedValueOnce({ newTrophies: [newTrophy], count: 1 });
    // After check, it refreshes data
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce([
      ...mockEarnedTrophies,
      { id: 2, user_id: 1, trophy_id: 2, earned_at: '2026-02-16T00:00:00Z', trophy: mockAllTrophies[1] },
    ]);

    let newlyEarned: any[] = [];
    await act(async () => {
      newlyEarned = await result.current.checkForNew();
    });

    expect(mockCheckTrophies).toHaveBeenCalledWith(1);
    expect(newlyEarned).toHaveLength(1);
    expect(newlyEarned[0].name).toBe('Getting Started');
  });

  it('handles API errors on load gracefully', async () => {
    mockFetchAllTrophies.mockRejectedValueOnce(new Error('Network error'));
    mockFetchUserTrophies.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useTrophies(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.allTrophies).toEqual([]);
  });

  it('handles checkForNew API error gracefully', async () => {
    // Initial load succeeds
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);
    mockCheckTrophies.mockResolvedValueOnce([]); // auto-check

    const { result } = renderHook(() => useTrophies(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // checkForNew fails
    mockCheckTrophies.mockRejectedValueOnce(new Error('Check failed'));

    let newlyEarned: any[] = [];
    await act(async () => {
      newlyEarned = await result.current.checkForNew();
    });

    // Should return empty array on error, not throw
    expect(newlyEarned).toEqual([]);
  });

  it('refresh reloads all data', async () => {
    // Initial load
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);
    mockCheckTrophies.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTrophies(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refresh
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      // Should have been called twice (initial + refresh)
      expect(mockFetchAllTrophies).toHaveBeenCalledTimes(2);
    });
  });

  it('calls check endpoint automatically on first load', async () => {
    mockFetchAllTrophies.mockResolvedValueOnce(mockAllTrophies);
    mockFetchUserTrophies.mockResolvedValueOnce(mockEarnedTrophies);
    mockCheckTrophies.mockResolvedValueOnce([]);

    renderHook(() => useTrophies(1));

    await waitFor(() => {
      expect(mockCheckTrophies).toHaveBeenCalledWith(1);
    });
  });
});
