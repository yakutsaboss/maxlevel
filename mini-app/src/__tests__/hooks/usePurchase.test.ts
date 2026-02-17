/**
 * Tests for usePurchase hook (mini-app/src/hooks/usePurchase.ts)
 *
 * Run 68 Agent E: Tests the purchase flow hook created by Agent C.
 * Covers: idle -> confirming -> processing -> success/error flow,
 * error handling, dismissResult state clearing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Mock the shop API client ───────────────────────────────────────

const mockPurchaseItem = vi.fn();
const mockFetchShopItems = vi.fn();
const mockFetchShopItem = vi.fn();
const mockFetchPurchaseHistory = vi.fn();

vi.mock('@/api/shop', () => ({
  purchaseItem: (...args: unknown[]) => mockPurchaseItem(...args),
  fetchShopItems: (...args: unknown[]) => mockFetchShopItems(...args),
  fetchShopItem: (...args: unknown[]) => mockFetchShopItem(...args),
  fetchPurchaseHistory: (...args: unknown[]) => mockFetchPurchaseHistory(...args),
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Import hook after mocks ────────────────────────────────────────

import { usePurchase } from '@/hooks/usePurchase';
import type { ShopItem, PurchaseResult } from '@/api/shop';

// ─── Test data ──────────────────────────────────────────────────────

const mockItem: ShopItem = {
  id: 1,
  type: 'achievement',
  reference_id: null,
  name: 'Golden Collector',
  description: 'A premium golden achievement',
  price_stars: 50,
  price_xp: 0,
  is_featured: false,
  is_active: true,
  rarity: 'rare',
  icon_emoji: '🏅',
  sort_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const mockDualPriceItem: ShopItem = {
  id: 3,
  type: 'xp_booster',
  reference_id: null,
  name: 'XP Doubler 24h',
  description: 'Double XP for 24 hours',
  price_stars: 30,
  price_xp: 500,
  is_featured: false,
  is_active: true,
  rarity: 'common',
  icon_emoji: '⚡',
  sort_order: 2,
  created_at: '2026-01-01T00:00:00Z',
};

const mockPurchaseResult: PurchaseResult = {
  purchase: {
    id: 1,
    user_id: 111,
    shop_item_id: 1,
    payment_method: 'stars',
    amount_paid: 50,
    purchased_at: '2026-02-15T12:00:00Z',
  },
  newBalance: {
    stars: 950,
  },
};

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('usePurchase', () => {
  const TEST_USER_ID = 111;

  it('starts in idle state', () => {
    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    expect(result.current.purchaseState).toBe('idle');
    expect(result.current.currentItem).toBeNull();
  });

  it('transitions to confirming state when startPurchase is called', () => {
    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    act(() => {
      result.current.startPurchase(mockItem);
    });

    expect(result.current.purchaseState).toBe('confirming');
    expect(result.current.currentItem).toEqual(mockItem);
  });

  it('transitions idle -> confirming -> processing -> success on successful purchase', async () => {
    mockPurchaseItem.mockResolvedValueOnce(mockPurchaseResult);

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    // Start purchase (idle -> confirming)
    act(() => {
      result.current.startPurchase(mockItem);
    });
    expect(result.current.purchaseState).toBe('confirming');

    // Confirm purchase (confirming -> processing -> success)
    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    await waitFor(() => {
      expect(result.current.purchaseState).toBe('success');
    });
  });

  it('transitions to error state on purchase failure', async () => {
    mockPurchaseItem.mockRejectedValueOnce(new Error('Insufficient balance'));

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    act(() => {
      result.current.startPurchase(mockItem);
    });

    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    await waitFor(() => {
      expect(result.current.purchaseState).toBe('error');
    });
  });

  it('calls purchaseItem API with correct parameters', async () => {
    mockPurchaseItem.mockResolvedValueOnce(mockPurchaseResult);

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    act(() => {
      result.current.startPurchase(mockItem);
    });

    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    expect(mockPurchaseItem).toHaveBeenCalledWith(
      TEST_USER_ID,
      mockItem.id,
      'stars'
    );
  });

  it('passes xp as payment method when XP payment is chosen', async () => {
    const xpPurchaseResult: PurchaseResult = {
      purchase: {
        id: 2,
        user_id: 111,
        shop_item_id: 3,
        payment_method: 'xp',
        amount_paid: 500,
        purchased_at: '2026-02-15T12:00:00Z',
      },
      newBalance: {
        xp: 1500,
      },
    };
    mockPurchaseItem.mockResolvedValueOnce(xpPurchaseResult);

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    act(() => {
      result.current.startPurchase(mockDualPriceItem);
    });

    await act(async () => {
      await result.current.confirmPurchase('xp');
    });

    expect(mockPurchaseItem).toHaveBeenCalledWith(
      TEST_USER_ID,
      mockDualPriceItem.id,
      'xp'
    );
  });

  it('dismissResult clears state back to idle', async () => {
    mockPurchaseItem.mockResolvedValueOnce(mockPurchaseResult);

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    // Complete a purchase
    act(() => {
      result.current.startPurchase(mockItem);
    });

    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    await waitFor(() => {
      expect(result.current.purchaseState).toBe('success');
    });

    // Dismiss
    act(() => {
      result.current.dismissResult();
    });

    expect(result.current.purchaseState).toBe('idle');
    expect(result.current.currentItem).toBeNull();
  });

  it('dismissResult clears error state back to idle', async () => {
    mockPurchaseItem.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    act(() => {
      result.current.startPurchase(mockItem);
    });

    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    await waitFor(() => {
      expect(result.current.purchaseState).toBe('error');
    });

    act(() => {
      result.current.dismissResult();
    });

    expect(result.current.purchaseState).toBe('idle');
    expect(result.current.currentItem).toBeNull();
  });

  it('does not call API if no item is selected', async () => {
    const { result } = renderHook(() => usePurchase({ userId: TEST_USER_ID }));

    // Try to confirm without starting
    await act(async () => {
      await result.current.confirmPurchase('stars');
    });

    expect(mockPurchaseItem).not.toHaveBeenCalled();
    expect(result.current.purchaseState).toBe('idle');
  });
});
