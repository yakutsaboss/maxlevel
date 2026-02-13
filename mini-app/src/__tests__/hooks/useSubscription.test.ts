/**
 * Tests for useSubscription hook (mini-app/src/hooks/useSubscription.ts)
 *
 * Tests subscription state management, effective tier computation,
 * mode limit derivation, channel status refresh, and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// ─── Mock apiClient ─────────────────────────────────────────────────

vi.mock('@/api/client', () => ({
  apiClient: {
    getSubscription: vi.fn(),
    getChannelStatus: vi.fn(),
    refreshChannelStatus: vi.fn(),
    getTiers: vi.fn(),
    getPaymentHistory: vi.fn(),
    upgradeSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
  },
}));

// ─── Imports after mocks ────────────────────────────────────────────

import { apiClient } from '@/api/client';
import { useSubscription } from '@/hooks/useSubscription';

const mockGetSubscription = vi.mocked(apiClient.getSubscription);
const mockGetChannelStatus = vi.mocked(apiClient.getChannelStatus);
const mockRefreshChannelStatus = vi.mocked(apiClient.refreshChannelStatus);
const mockGetTiers = vi.mocked(apiClient.getTiers);

// ─── Test data ──────────────────────────────────────────────────────

const mockSubscriptionFree = {
  success: true,
  data: { tier: 'free', is_active: true, is_expired: false, expires_at: null },
};

const mockSubscriptionSubscriber = {
  success: true,
  data: { tier: 'subscriber', is_active: true, is_expired: false, expires_at: null },
};

const mockSubscriptionPremium = {
  success: true,
  data: {
    tier: 'premium',
    is_active: true,
    is_expired: false,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
  },
};

const mockChannelSubscribed = {
  success: true,
  data: { is_subscribed: true, channel: '@yakutsaway', checked_at: new Date().toISOString() },
};

const mockChannelNotSubscribed = {
  success: true,
  data: { is_subscribed: false, channel: '@yakutsaway', checked_at: new Date().toISOString() },
};

const mockTiers = {
  success: true,
  data: [
    { name: 'free', modeLimit: 2, price: 0, purchasable: false, channelRequired: false },
    { name: 'subscriber', modeLimit: 3, price: 0, purchasable: false, channelRequired: true },
    { name: 'premium', modeLimit: 6, price: 599, purchasable: true, channelRequired: false },
  ],
};

// ─── Setup ──────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Tests ──────────────────────────────────────────────────────────

describe('useSubscription', () => {
  it('starts in loading state', () => {
    mockGetSubscription.mockReturnValue(new Promise(() => {})); // never resolves
    mockGetChannelStatus.mockReturnValue(new Promise(() => {}));
    mockGetTiers.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeFalsy();
  });

  it('fetches subscription, channel status, and tiers on mount', async () => {
    mockGetSubscription.mockResolvedValue(mockSubscriptionFree as any);
    mockGetChannelStatus.mockResolvedValue(mockChannelNotSubscribed as any);
    mockGetTiers.mockResolvedValue(mockTiers as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetSubscription).toHaveBeenCalledWith(1, expect.any(Object));
    expect(mockGetChannelStatus).toHaveBeenCalledWith(1, expect.any(Object));
    expect(result.current.error).toBeFalsy();
  });

  it('computes effectiveTier as free when subscription is free', async () => {
    mockGetSubscription.mockResolvedValue(mockSubscriptionFree as any);
    mockGetChannelStatus.mockResolvedValue(mockChannelNotSubscribed as any);
    mockGetTiers.mockResolvedValue(mockTiers as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.effectiveTier).toBe('free');
    expect(result.current.modeLimit).toBe(2);
  });

  it('computes effectiveTier as subscriber when backend returns subscriber tier', async () => {
    // Backend auto-upgrades tier when channel subscription is active
    mockGetSubscription.mockResolvedValue(mockSubscriptionSubscriber as any);
    mockGetChannelStatus.mockResolvedValue(mockChannelSubscribed as any);
    mockGetTiers.mockResolvedValue(mockTiers as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.effectiveTier).toBe('subscriber');
    expect(result.current.modeLimit).toBe(3);
  });

  it('computes effectiveTier as premium for premium subscription', async () => {
    mockGetSubscription.mockResolvedValue(mockSubscriptionPremium as any);
    mockGetChannelStatus.mockResolvedValue(mockChannelSubscribed as any);
    mockGetTiers.mockResolvedValue(mockTiers as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.effectiveTier).toBe('premium');
    expect(result.current.modeLimit).toBe(6);
  });

  it('sets error state on fetch failure', async () => {
    mockGetSubscription.mockRejectedValue(new Error('Network error'));
    mockGetChannelStatus.mockRejectedValue(new Error('Network error'));
    mockGetTiers.mockResolvedValue(mockTiers as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('refreshChannel calls refreshChannelStatus API', async () => {
    mockGetSubscription.mockResolvedValue(mockSubscriptionFree as any);
    mockGetChannelStatus.mockResolvedValue(mockChannelNotSubscribed as any);
    mockGetTiers.mockResolvedValue(mockTiers as any);
    mockRefreshChannelStatus.mockResolvedValue({
      success: true,
      data: { is_subscribed: true, channel: '@yakutsaway', checked_at: new Date().toISOString() },
    } as any);

    const { result } = renderHook(() => useSubscription({ userId: 1 }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.refreshChannel();
    });

    expect(mockRefreshChannelStatus).toHaveBeenCalledWith(1);
  });
});
