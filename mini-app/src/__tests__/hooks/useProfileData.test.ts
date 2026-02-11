import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useProfileData } from '@/hooks/useProfileData';

// Mock apiClient
vi.mock('@/api/client', () => ({
  apiClient: {
    getUserStats: vi.fn(),
    getUserAchievements: vi.fn(),
    getAchievements: vi.fn(),
    getPunishmentSettings: vi.fn(),
    getPunishmentHistory: vi.fn(),
  },
}));

import { apiClient } from '@/api/client';

const mockGetUserStats = vi.mocked(apiClient.getUserStats);
const mockGetUserAchievements = vi.mocked(apiClient.getUserAchievements);
const mockGetAchievements = vi.mocked(apiClient.getAchievements);
const mockGetPunishmentSettings = vi.mocked(apiClient.getPunishmentSettings);
const mockGetPunishmentHistory = vi.mocked(apiClient.getPunishmentHistory);

const mockStatsData = {
  user: { id: 1, telegram_id: 123, username: 'test', first_name: 'Test', level: 5, xp: 100, total_xp: 500 },
  modes: [],
  activeQuests: [],
  completedQuestsToday: 0,
  recentAchievements: [],
};

const mockAchievements = [
  { id: 1, name: 'First Steps', description: 'Begin your journey', icon: '🎯', xp_reward: 50, rarity: 'common', category: 'general' },
];

const mockUserAchievements = [
  { user_id: 1, achievement_id: 1, unlocked_at: '2026-01-01', achievement: mockAchievements[0] },
];

describe('useProfileData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetUserStats.mockReturnValue(new Promise(() => {}));
    mockGetUserAchievements.mockReturnValue(new Promise(() => {}));
    mockGetAchievements.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useProfileData(123));

    expect(result.current.loading).toBe(true);
    expect(result.current.stats).toBeNull();
    expect(result.current.achievements).toEqual([]);
    expect(result.current.allAchievements).toEqual([]);
    expect(result.current.error).toBe(false);
  });

  it('fetches stats, achievements, and all achievements in parallel', async () => {
    mockGetUserStats.mockResolvedValue({ success: true, data: mockStatsData } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAchievements } as any);
    mockGetPunishmentSettings.mockResolvedValue({ success: true, data: { consent_given: false, intensity_level: 'mild', safe_mode: true } } as any);

    const { result } = renderHook(() => useProfileData(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // All three parallel calls were made (with AbortSignal)
    const signalMatcher = expect.objectContaining({ signal: expect.any(AbortSignal) });
    expect(mockGetUserStats).toHaveBeenCalledWith(123, signalMatcher);
    expect(mockGetUserAchievements).toHaveBeenCalledWith(123, signalMatcher);
    expect(mockGetAchievements).toHaveBeenCalledWith(signalMatcher);

    // Data is populated
    expect(result.current.stats).toEqual(mockStatsData);
    expect(result.current.achievements).toEqual(mockUserAchievements);
    expect(result.current.allAchievements).toEqual(mockAchievements);
    expect(result.current.error).toBe(false);
  });

  it('handles punishment API error gracefully', async () => {
    mockGetUserStats.mockResolvedValue({ success: true, data: mockStatsData } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAchievements } as any);
    mockGetPunishmentSettings.mockRejectedValue(new Error('Punishment API not available'));

    const { result } = renderHook(() => useProfileData(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Stats still loaded despite punishment API failure
    expect(result.current.stats).toEqual(mockStatsData);
    expect(result.current.error).toBe(false);
    expect(result.current.punishmentSettings).toBeNull();
  });

  it('sets error state when main fetch fails', async () => {
    mockGetUserStats.mockRejectedValue(new Error('Network error'));
    mockGetUserAchievements.mockRejectedValue(new Error('Network error'));
    mockGetAchievements.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useProfileData(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
    expect(result.current.stats).toBeNull();
  });

  it('handles undefined userId gracefully', async () => {
    const { result } = renderHook(() => useProfileData(undefined));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.stats).toBeNull();
    expect(mockGetUserStats).not.toHaveBeenCalled();
  });

  it('loads punishment history when consent is given', async () => {
    mockGetUserStats.mockResolvedValue({ success: true, data: mockStatsData } as any);
    mockGetUserAchievements.mockResolvedValue({ success: true, data: mockUserAchievements } as any);
    mockGetAchievements.mockResolvedValue({ success: true, data: mockAchievements } as any);
    mockGetPunishmentSettings.mockResolvedValue({
      success: true,
      data: { consent_given: true, intensity_level: 'medium', safe_mode: false },
    } as any);
    mockGetPunishmentHistory.mockResolvedValue({
      success: true,
      data: { punishments: [{ xp_deducted: 10, punishment_type: 'xp_loss', applied_at: '2026-01-01', notes: 'Missed quest' }] },
    } as any);

    const { result } = renderHook(() => useProfileData(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await waitFor(() => {
      expect(mockGetPunishmentHistory).toHaveBeenCalledWith(123, 1, 5, expect.objectContaining({ signal: expect.any(AbortSignal) }));
    });

    await waitFor(() => {
      expect(result.current.punishmentHistory).toHaveLength(1);
    });
  });
});
