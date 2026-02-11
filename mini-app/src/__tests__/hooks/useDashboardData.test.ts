import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDashboardData } from '@/hooks/useDashboardData';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock apiClient
vi.mock('@/api/client', () => ({
  apiClient: {
    getUserStats: vi.fn(),
    checkAchievements: vi.fn(),
  },
}));

// Mock usePullToRefresh
vi.mock('@/hooks/usePullToRefresh', () => ({
  usePullToRefresh: (_onRefresh: () => Promise<void>, _haptic: unknown) => ({
    containerRef: { current: null },
    pullDistance: 0,
    refreshing: false,
    pullThreshold: 60,
    touchHandlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

import { apiClient } from '@/api/client';

const mockGetUserStats = vi.mocked(apiClient.getUserStats);
const mockCheckAchievements = vi.mocked(apiClient.checkAchievements);

const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
};

const mockStatsResponse = {
  success: true,
  data: {
    user: { id: 1, telegram_id: 123, username: 'test', first_name: 'Test', level: 5, xp: 100, total_xp: 500 },
    modes: [],
    activeQuests: [],
    completedQuestsToday: 0,
    recentAchievements: [],
  },
};

describe('useDashboardData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetUserStats.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useDashboardData({ userId: 123, haptic: mockHaptic })
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.error).toBe(false);
  });

  it('loads user stats successfully', async () => {
    mockGetUserStats.mockResolvedValue(mockStatsResponse as any);

    const { result } = renderHook(() =>
      useDashboardData({ userId: 123, haptic: mockHaptic })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toEqual(mockStatsResponse.data);
    expect(result.current.error).toBe(false);
    expect(mockGetUserStats).toHaveBeenCalledWith(123, expect.objectContaining({ signal: expect.any(AbortSignal) }));
  });

  it('sets error state on fetch failure', async () => {
    mockGetUserStats.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useDashboardData({ userId: 123, haptic: mockHaptic })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.stats).toBeNull();
  });

  it('fires haptic notification on new achievement', async () => {
    mockGetUserStats.mockResolvedValue({
      success: true,
      data: {
        ...mockStatsResponse.data,
        user: { ...mockStatsResponse.data.user, id: 1 },
      },
    } as any);

    mockCheckAchievements.mockResolvedValue({
      success: true,
      data: {
        newAchievements: [
          { id: 10, name: 'First Steps', description: 'Complete first quest', badge_icon: '🎯', xp_bonus: 50, rarity: 'common', category: 'general' },
        ],
        count: 1,
      },
    } as any);

    const { result } = renderHook(() =>
      useDashboardData({ userId: 123, haptic: mockHaptic })
    );

    // Wait for initial load (checkAchievements=false on mount)
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refresh (which calls loadUserStats(true) -> checkAchievements)
    await result.current.loadUserStats(true);

    await waitFor(() => {
      expect(mockCheckAchievements).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    });
  });

  it('handles undefined userId gracefully', async () => {
    const { result } = renderHook(() =>
      useDashboardData({ userId: undefined, haptic: mockHaptic })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(mockGetUserStats).not.toHaveBeenCalled();
  });
});
