/**
 * Tests for useShop hook (mini-app/src/hooks/useShop.ts)
 *
 * Run 69 Agent E: Tests the shop data management hook created by Agent A.
 * Covers: loading/error states, category filtering, search, owned items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

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

// ─── Mock the shop API ──────────────────────────────────────────────

const mockFetchShopItems = vi.fn();
const mockFetchPurchaseHistory = vi.fn();

vi.mock('@/api/shop', () => ({
  fetchShopItems: (...args: unknown[]) => mockFetchShopItems(...args),
  fetchShopItem: vi.fn(),
  purchaseItem: vi.fn(),
  fetchPurchaseHistory: (...args: unknown[]) => mockFetchPurchaseHistory(...args),
}));

// ─── Mock logger ────────────────────────────────────────────────────

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

// ─── Import hook after mocks ────────────────────────────────────────

import { useShop } from '@/hooks/useShop';

// ─── Test data ──────────────────────────────────────────────────────

const mockItems = [
  {
    id: 1, type: 'achievement', reference_id: 101, name: 'Golden Collector',
    description: 'A premium golden achievement', price_stars: 50, price_xp: 0,
    is_featured: true, is_active: true, rarity: 'rare', icon_emoji: '🏅',
    sort_order: 1, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 2, type: 'achievement', reference_id: 102, name: 'Diamond Streak',
    description: 'Diamond-level streak achievement', price_stars: 100, price_xp: 0,
    is_featured: false, is_active: true, rarity: 'epic', icon_emoji: '💎',
    sort_order: 2, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 3, type: 'avatar_item', reference_id: 201, name: 'Premium Hairstyle',
    description: 'An exclusive hairstyle', price_stars: 30, price_xp: 200,
    is_featured: false, is_active: true, rarity: 'rare', icon_emoji: '💇',
    sort_order: 3, created_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 4, type: 'xp_booster', reference_id: null, name: 'XP Doubler 24h',
    description: 'Double XP for 24 hours', price_stars: 30, price_xp: 500,
    is_featured: true, is_active: true, rarity: 'common', icon_emoji: '⚡',
    sort_order: 4, created_at: '2026-02-01T00:00:00Z',
  },
];

const mockPurchases = [
  {
    id: 1, user_id: 1, shop_item_id: 1, payment_method: 'stars',
    amount_paid: 50, purchased_at: '2026-02-10T12:00:00Z',
  },
];

// ─── Tests ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useShop', () => {
  it('loads shop items on mount', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce(mockPurchases);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toHaveLength(4);
    expect(result.current.error).toBeNull();
  });

  it('returns loading state correctly', async () => {
    let resolveItems!: (v: any) => void;
    const itemsPromise = new Promise((resolve) => { resolveItems = resolve; });
    mockFetchShopItems.mockReturnValueOnce(itemsPromise);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveItems(mockItems);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('identifies featured items', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const featured = result.current.featuredItems;
    expect(featured).toHaveLength(2);
    expect(featured.every((i: any) => i.is_featured)).toBe(true);
  });

  it('tracks owned item IDs from purchase history', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce(mockPurchases);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Item 1 was purchased
    expect(result.current.ownedItemIds.has(1)).toBe(true);
    // Item 2 was not purchased
    expect(result.current.ownedItemIds.has(2)).toBe(false);
  });

  it('filters items by category', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Set category to 'achievement'
    act(() => {
      result.current.setCategory('achievement');
    });

    expect(result.current.filteredItems.every((i: any) => i.type === 'achievement')).toBe(true);
    expect(result.current.filteredItems).toHaveLength(2);
  });

  it('shows all items when category is "all"', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Default category should be 'all'
    expect(result.current.category).toBe('all');
    expect(result.current.filteredItems).toHaveLength(4);
  });

  it('filters items by search query', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('golden');
    });

    // Only "Golden Collector" should match
    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Golden Collector');
  });

  it('search is case-insensitive', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('DIAMOND');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Diamond Streak');
  });

  it('combines category filter and search query', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Filter by achievement category and search for "golden"
    act(() => {
      result.current.setCategory('achievement');
      result.current.setSearchQuery('golden');
    });

    expect(result.current.filteredItems).toHaveLength(1);
    expect(result.current.filteredItems[0].name).toBe('Golden Collector');
  });

  it('handles API errors gracefully', async () => {
    mockFetchShopItems.mockRejectedValueOnce(new Error('Network error'));
    mockFetchPurchaseHistory.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.items).toEqual([]);
  });

  it('refresh reloads data', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refresh
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce(mockPurchases);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(mockFetchShopItems).toHaveBeenCalledTimes(2);
    });
  });

  it('returns empty filteredItems when search matches nothing', async () => {
    mockFetchShopItems.mockResolvedValueOnce(mockItems);
    mockFetchPurchaseHistory.mockResolvedValueOnce([]);

    const { result } = renderHook(() => useShop(1), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.setSearchQuery('nonexistent-item-xyz');
    });

    expect(result.current.filteredItems).toHaveLength(0);
  });
});
