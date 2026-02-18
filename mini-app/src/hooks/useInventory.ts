import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { fetchInventory, equipItem, unequipItem } from '@/api/inventory';
import type { InventoryItem } from '@/api/inventory';
import { logger } from '@/utils/logger';

export type InventoryCategory = 'all' | 'achievement' | 'avatar_item' | 'trophy_booster' | 'xp_booster';

interface UseInventoryReturn {
  items: InventoryItem[];
  grouped: Record<string, InventoryItem[]>;
  filteredItems: InventoryItem[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  category: InventoryCategory;
  setCategory: (cat: InventoryCategory) => void;
  equip: (itemId: number) => Promise<void>;
  unequip: (itemId: number) => Promise<void>;
  refresh: () => void;
}

export function useInventory(userId: number | undefined): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [grouped, setGrouped] = useState<Record<string, InventoryItem[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<InventoryCategory>('all');
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory(userId);
      if (!mountedRef.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setGrouped(data.grouped || {});
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load inventory';
      setError(msg);
      logger.error('useInventory loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const filteredItems = useMemo(() => {
    if (category === 'all') return items;
    return items.filter((item) => item.type === category);
  }, [items, category]);

  const equip = useCallback(async (itemId: number) => {
    if (!userId) return;
    try {
      await equipItem(userId, itemId);
      // Optimistically update local state
      setItems((prev) =>
        prev.map((item) => {
          if (item.type === 'avatar_item') {
            return { ...item, is_equipped: item.shop_item_id === itemId };
          }
          return item;
        })
      );
      logger.info('Item equipped', { userId, itemId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to equip item';
      logger.error('useInventory equip error', { error: err });
      throw new Error(msg);
    }
  }, [userId]);

  const unequip = useCallback(async (itemId: number) => {
    if (!userId) return;
    try {
      await unequipItem(userId, itemId);
      // Optimistically update local state
      setItems((prev) =>
        prev.map((item) => {
          if (item.shop_item_id === itemId) {
            return { ...item, is_equipped: false };
          }
          return item;
        })
      );
      logger.info('Item unequipped', { userId, itemId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to unequip item';
      logger.error('useInventory unequip error', { error: err });
      throw new Error(msg);
    }
  }, [userId]);

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    items,
    grouped,
    filteredItems,
    totalCount,
    loading,
    error,
    category,
    setCategory,
    equip,
    unequip,
    refresh,
  };
}
