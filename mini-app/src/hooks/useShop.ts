import { useState, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useShopItems, useInventory, shopKeys } from '@/hooks/useShopQuery';
import type { ShopItem, Purchase } from '@/api/shop.js';
import type { ShopItemType } from '@/api/shop.js';

export type ShopCategory = 'all' | ShopItemType;

interface UseShopReturn {
  /** All active shop items (unfiltered) */
  items: ShopItem[];
  /** Items filtered by active category + search query */
  filteredItems: ShopItem[];
  /** Featured items (is_featured === true) */
  featuredItems: ShopItem[];
  /** User purchase history */
  purchases: Purchase[];
  /** Set of purchased shop_item_ids for quick "owned" checks */
  ownedItemIds: Set<number>;
  /** Current active category filter */
  category: ShopCategory;
  /** Set category filter */
  setCategory: (cat: ShopCategory) => void;
  /** Current search query */
  searchQuery: string;
  /** Set search query (filters by name) */
  setSearchQuery: (q: string) => void;
  /** Loading state */
  loading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh all data */
  refresh: () => Promise<void>;
}

export function useShop(userId: number | undefined): UseShopReturn {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<ShopCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // React Query hooks
  const itemsQuery = useShopItems();
  const inventoryQuery = useInventory(userId);

  // Extract data with fallbacks
  const items = itemsQuery.data ?? [];
  const purchases = inventoryQuery.data ?? [];
  const loading = itemsQuery.isLoading || inventoryQuery.isLoading;
  const error = itemsQuery.isError
    ? (itemsQuery.error instanceof Error ? itemsQuery.error.message : 'Failed to load shop')
    : null;

  const ownedItemIds = useMemo(() => {
    return new Set(purchases.map((p) => p.shop_item_id));
  }, [purchases]);

  const featuredItems = useMemo(() => {
    return items.filter((item) => item.is_featured);
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = items;

    if (category !== 'all') {
      result = result.filter((item) => item.type === category);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [items, category, searchQuery]);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: shopKeys.items() }),
      ...(userId ? [queryClient.invalidateQueries({ queryKey: shopKeys.inventory(userId) })] : []),
    ]);
  }, [userId, queryClient]);

  return {
    items,
    filteredItems,
    featuredItems,
    purchases,
    ownedItemIds,
    category,
    setCategory,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    refresh,
  };
}
