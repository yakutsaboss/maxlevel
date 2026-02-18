import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchShopItems, fetchPurchaseHistory } from '@/api/shop.js';
import type { ShopItem, ShopItemType, Purchase } from '@/api/shop.js';
import { logger } from '@/utils/logger.js';

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
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ShopCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const requests: [Promise<ShopItem[]>, Promise<Purchase[]> | Promise<never[]>] = [
        fetchShopItems(),
        userId ? fetchPurchaseHistory(userId) : Promise.resolve([]),
      ];

      const [shopItems, purchaseHistory] = await Promise.all(requests);
      setItems(shopItems);
      setPurchases(purchaseHistory as Purchase[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load shop';
      setError(message);
      logger.error('Failed to load shop data', { error: err });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
    await loadData();
  }, [loadData]);

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
