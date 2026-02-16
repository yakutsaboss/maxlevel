import { useState, useCallback, useEffect, useRef } from 'react';
import { getAvatarItems, getUserAvatar, equipAvatarItem } from '@/api/avatars.js';
import type { AvatarItem, EquippedItems } from '@/api/avatars.js';
import { logger } from '@/utils/logger.js';

const DEFAULT_EQUIPPED: EquippedItems = {
  hairstyle: null,
  outfit: null,
  accessory: null,
  background: null,
};

export interface UseAvatarReturn {
  items: AvatarItem[];
  equipped: EquippedItems;
  preview: EquippedItems;
  loading: boolean;
  saving: boolean;
  error: string | null;
  previewItem: (category: string, spriteKey: string | null) => void;
  equipItem: (category: string, itemId: number | null) => Promise<void>;
  resetPreview: () => void;
  isItemUnlocked: (item: AvatarItem, userLevel: number, userAchievements: string[]) => boolean;
  refresh: () => void;
}

export function useAvatar(userId: number | undefined): UseAvatarReturn {
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [equipped, setEquipped] = useState<EquippedItems>(DEFAULT_EQUIPPED);
  const [preview, setPreview] = useState<EquippedItems>(DEFAULT_EQUIPPED);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [allItems, userEquipped] = await Promise.all([
        getAvatarItems(),
        getUserAvatar(userId),
      ]);
      if (!mountedRef.current) return;
      setItems(allItems);
      setEquipped(userEquipped);
      setPreview(userEquipped);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load avatar data';
      setError(msg);
      logger.error('useAvatar loadData error', { error: err });
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    mountedRef.current = true;
    loadData();
    return () => { mountedRef.current = false; };
  }, [loadData]);

  const previewItem = useCallback((category: string, spriteKey: string | null) => {
    setPreview(prev => ({
      ...prev,
      [category]: spriteKey,
    }));
  }, []);

  const equipItem = useCallback(async (category: string, itemId: number | null) => {
    if (!userId) return;
    setSaving(true);
    try {
      const updated = await equipAvatarItem(userId, category, itemId);
      if (!mountedRef.current) return;
      setEquipped(updated);
      setPreview(updated);
    } catch (err) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to equip item';
      setError(msg);
      logger.error('useAvatar equipItem error', { error: err });
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  }, [userId]);

  const resetPreview = useCallback(() => {
    setPreview(equipped);
  }, [equipped]);

  const isItemUnlocked = useCallback(
    (item: AvatarItem, userLevel: number, userAchievements: string[]): boolean => {
      switch (item.unlock_type) {
        case 'free':
          return true;
        case 'level': {
          const requiredLevel = (item.unlock_criteria?.level as number) ?? 0;
          return userLevel >= requiredLevel;
        }
        case 'achievement': {
          const requiredAchievement = (item.unlock_criteria?.achievement as string) ?? '';
          return userAchievements.includes(requiredAchievement);
        }
        default:
          return false;
      }
    },
    [],
  );

  const refresh = useCallback(() => {
    loadData();
  }, [loadData]);

  return {
    items,
    equipped,
    preview,
    loading,
    saving,
    error,
    previewItem,
    equipItem,
    resetPreview,
    isItemUnlocked,
    refresh,
  };
}
