/**
 * Tests for useSocial hook (mini-app/src/hooks/useSocial.ts)
 *
 * Agent B creates useSocial in Run 61 — a data hook that loads friends,
 * pending requests, and challenges, and exposes mutation functions.
 *
 * Mocks: api/social.ts functions, @twa-dev/sdk
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ─── Mock social API client ─────────────────────────────────────────

const mockGetFriends = vi.fn();
const mockGetPendingRequests = vi.fn();
const mockGetChallenges = vi.fn();
const mockSendFriendRequest = vi.fn();
const mockAcceptFriendRequest = vi.fn();
const mockRejectFriendRequest = vi.fn();
const mockRemoveFriend = vi.fn();
const mockJoinChallenge = vi.fn();
const mockUpdateChallengeProgress = vi.fn();
const mockCreateChallenge = vi.fn();

vi.mock('@/api/social', () => ({
  getFriends: (...args: unknown[]) => mockGetFriends(...args),
  getPendingRequests: (...args: unknown[]) => mockGetPendingRequests(...args),
  getChallenges: (...args: unknown[]) => mockGetChallenges(...args),
  sendFriendRequest: (...args: unknown[]) => mockSendFriendRequest(...args),
  acceptFriendRequest: (...args: unknown[]) => mockAcceptFriendRequest(...args),
  rejectFriendRequest: (...args: unknown[]) => mockRejectFriendRequest(...args),
  removeFriend: (...args: unknown[]) => mockRemoveFriend(...args),
  joinChallenge: (...args: unknown[]) => mockJoinChallenge(...args),
  updateChallengeProgress: (...args: unknown[]) => mockUpdateChallengeProgress(...args),
  createChallenge: (...args: unknown[]) => mockCreateChallenge(...args),
}));

// ─── Mock @twa-dev/sdk ──────────────────────────────────────────────

vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123 } },
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
  },
}));

// ─── Import after mocks ─────────────────────────────────────────────

import { useSocial } from '@/hooks/useSocial';

// ─── Test data ──────────────────────────────────────────────────────

const mockFriendsData = [
  { id: 2, username: 'alice', first_name: 'Alice', current_level: 5, total_xp: 2500, is_active: true, friends_since: '2026-01-15T00:00:00Z' },
  { id: 3, username: 'bob', first_name: 'Bob', current_level: 3, total_xp: 1200, is_active: true, friends_since: '2026-01-20T00:00:00Z' },
];

const mockPendingData = [
  { id: 10, from_user: { id: 4, username: 'charlie', first_name: 'Charlie', current_level: 7 }, created_at: '2026-02-10T12:00:00Z' },
];

const mockChallengesData = [
  { id: 20, title: 'Daily Steps', creator_id: 1, progress: 5000, participant_count: 3, status: 'active' },
];

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  // Default successful responses
  mockGetFriends.mockResolvedValue(mockFriendsData);
  mockGetPendingRequests.mockResolvedValue(mockPendingData);
  mockGetChallenges.mockResolvedValue(mockChallengesData);
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('useSocial', () => {
  it('loads friends on mount', async () => {
    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetFriends).toHaveBeenCalledWith(1);
    expect(result.current.friends).toEqual(mockFriendsData);
  });

  it('loads pending requests on mount', async () => {
    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetPendingRequests).toHaveBeenCalledWith(1);
    expect(result.current.pendingRequests).toEqual(mockPendingData);
  });

  it('loads challenges on mount', async () => {
    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetChallenges).toHaveBeenCalledWith(1);
    expect(result.current.challenges).toEqual(mockChallengesData);
  });

  it('sets loading state correctly during data fetch', async () => {
    let resolveFriends: (v: unknown[]) => void;
    mockGetFriends.mockReturnValue(new Promise(r => { resolveFriends = r; }));

    const { result } = renderHook(() => useSocial(1));

    // Should be loading initially
    expect(result.current.loading).toBe(true);

    // Resolve the API call
    await act(async () => {
      resolveFriends!(mockFriendsData);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('handles API errors and sets error state', async () => {
    mockGetFriends.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('acceptRequest calls API and refreshes data', async () => {
    mockAcceptFriendRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Clear mocks to track refresh calls
    mockGetFriends.mockClear();
    mockGetPendingRequests.mockClear();
    mockGetChallenges.mockClear();
    mockGetFriends.mockResolvedValue(mockFriendsData);
    mockGetPendingRequests.mockResolvedValue([]);
    mockGetChallenges.mockResolvedValue(mockChallengesData);

    await act(async () => {
      await result.current.acceptRequest(10, 1);
    });

    expect(mockAcceptFriendRequest).toHaveBeenCalledWith(10, 1);
    // Should have refreshed the data
    expect(mockGetFriends).toHaveBeenCalled();
  });

  it('rejectRequest calls API and refreshes data', async () => {
    mockRejectFriendRequest.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetPendingRequests.mockClear();
    mockGetPendingRequests.mockResolvedValue([]);

    await act(async () => {
      await result.current.rejectRequest(10, 1);
    });

    expect(mockRejectFriendRequest).toHaveBeenCalledWith(10, 1);
    expect(mockGetPendingRequests).toHaveBeenCalled();
  });

  it('joinChallenge calls API and refreshes data', async () => {
    mockJoinChallenge.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetChallenges.mockClear();
    mockGetChallenges.mockResolvedValue(mockChallengesData);

    await act(async () => {
      await result.current.joinChallenge(20, 1);
    });

    expect(mockJoinChallenge).toHaveBeenCalledWith(20, 1);
    expect(mockGetChallenges).toHaveBeenCalled();
  });

  it('refresh reloads all data', async () => {
    const { result } = renderHook(() => useSocial(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    mockGetFriends.mockClear();
    mockGetPendingRequests.mockClear();
    mockGetChallenges.mockClear();
    mockGetFriends.mockResolvedValue([]);
    mockGetPendingRequests.mockResolvedValue([]);
    mockGetChallenges.mockResolvedValue([]);

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockGetFriends).toHaveBeenCalledWith(1);
    expect(mockGetPendingRequests).toHaveBeenCalledWith(1);
    expect(mockGetChallenges).toHaveBeenCalledWith(1);
  });
});
