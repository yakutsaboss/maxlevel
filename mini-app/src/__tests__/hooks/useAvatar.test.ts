/**
 * Tests for useAvatar hook (mini-app/src/hooks/useAvatar.ts)
 *
 * Run 66 Agent E: Tests the avatar hook created by Agent C.
 * Covers: loading, previewing, equipping, reset, unlock logic, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock the avatar API client
const mockGetAvatarItems = vi.fn();
const mockGetUserAvatar = vi.fn();
const mockEquipAvatarItem = vi.fn();

vi.mock('@/api/avatars', () => ({
  getAvatarItems: (...args: unknown[]) => mockGetAvatarItems(...args),
  getUserAvatar: (...args: unknown[]) => mockGetUserAvatar(...args),
  equipAvatarItem: (...args: unknown[]) => mockEquipAvatarItem(...args),
}));

// Mock logger (used by useAvatar)
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { useAvatar } from '@/hooks/useAvatar';

// --- Test data ---

const mockItems = [
  { id: 1, category: 'hairstyle', name: 'Spiky', sprite_key: 'hair-spiky', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
  { id: 2, category: 'hairstyle', name: 'Mohawk', sprite_key: 'hair-mohawk', rarity: 'rare', unlock_type: 'level', unlock_criteria: { level: 5 }, sort_order: 1 },
  { id: 3, category: 'outfit', name: 'T-Shirt', sprite_key: 'outfit-tshirt', rarity: 'common', unlock_type: 'free', unlock_criteria: {}, sort_order: 0 },
  { id: 4, category: 'accessory', name: 'Wings', sprite_key: 'acc-wings', rarity: 'epic', unlock_type: 'achievement', unlock_criteria: { achievement: 'level_25' }, sort_order: 0 },
  { id: 5, category: 'hairstyle', name: 'Flame Hair', sprite_key: 'hair-flame', rarity: 'legendary', unlock_type: 'achievement', unlock_criteria: { achievement: 'streak_30' }, sort_order: 2 },
];

const mockEquipped = {
  hairstyle: 'hair-spiky',
  outfit: null,
  accessory: null,
  background: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAvatarItems.mockResolvedValue(mockItems);
  mockGetUserAvatar.mockResolvedValue(mockEquipped);
});

describe('useAvatar', () => {
  it('loads items and equipped avatar on mount', async () => {
    const { result } = renderHook(() => useAvatar(1));

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.items).toEqual(mockItems);
    expect(result.current.equipped).toEqual(mockEquipped);
    expect(result.current.preview).toEqual(mockEquipped);
    expect(result.current.error).toBeNull();
    expect(mockGetAvatarItems).toHaveBeenCalled();
    expect(mockGetUserAvatar).toHaveBeenCalledWith(1);
  });

  it('previewItem updates preview state without API call', async () => {
    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.previewItem('hairstyle', 'hair-mohawk');
    });

    expect(result.current.preview.hairstyle).toBe('hair-mohawk');
    // Equipped should not change
    expect(result.current.equipped.hairstyle).toBe('hair-spiky');
    // No additional API calls for preview
    expect(mockEquipAvatarItem).not.toHaveBeenCalled();
  });

  it('equipItem calls API and updates both equipped and preview', async () => {
    const updatedEquipped = { ...mockEquipped, hairstyle: 'hair-mohawk' };
    mockEquipAvatarItem.mockResolvedValueOnce(updatedEquipped);

    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.equipItem('hairstyle', 2);
    });

    expect(mockEquipAvatarItem).toHaveBeenCalledWith(1, 'hairstyle', 2);
    expect(result.current.equipped.hairstyle).toBe('hair-mohawk');
    expect(result.current.preview.hairstyle).toBe('hair-mohawk');
    expect(result.current.saving).toBe(false);
  });

  it('resetPreview restores preview to current equipped', async () => {
    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Change preview
    act(() => {
      result.current.previewItem('hairstyle', 'hair-mohawk');
      result.current.previewItem('outfit', 'outfit-tshirt');
    });

    expect(result.current.preview.hairstyle).toBe('hair-mohawk');
    expect(result.current.preview.outfit).toBe('outfit-tshirt');

    // Reset
    act(() => {
      result.current.resetPreview();
    });

    expect(result.current.preview).toEqual(result.current.equipped);
  });

  it('isItemUnlocked returns true for free items', async () => {
    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const freeItem = mockItems[0]; // Spiky, unlock_type: 'free'
    expect(result.current.isItemUnlocked(freeItem, 1, [])).toBe(true);
  });

  it('isItemUnlocked checks level for level-locked items', async () => {
    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const levelItem = mockItems[1]; // Mohawk, unlock_type: 'level', level: 5

    // User level 3 — should be locked
    expect(result.current.isItemUnlocked(levelItem, 3, [])).toBe(false);

    // User level 5 — should be unlocked
    expect(result.current.isItemUnlocked(levelItem, 5, [])).toBe(true);

    // User level 10 — should be unlocked
    expect(result.current.isItemUnlocked(levelItem, 10, [])).toBe(true);
  });

  it('isItemUnlocked checks achievements for achievement-locked items', async () => {
    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const achievementItem = mockItems[3]; // Wings, unlock_type: 'achievement', achievement: 'level_25'

    // Without the achievement
    expect(result.current.isItemUnlocked(achievementItem, 30, [])).toBe(false);

    // With the achievement
    expect(result.current.isItemUnlocked(achievementItem, 30, ['level_25'])).toBe(true);
  });

  it('handles API errors on load', async () => {
    mockGetAvatarItems.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.items).toEqual([]);
  });

  it('handles API errors on equip — sets error and keeps equipped unchanged', async () => {
    mockEquipAvatarItem.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useAvatar(1));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.equipItem('hairstyle', 2);
    });

    // Error is set, equipped remains unchanged
    expect(result.current.error).toBe('Server error');
    expect(result.current.equipped).toEqual(mockEquipped);
    expect(result.current.saving).toBe(false);
  });

  it('does not load data when userId is undefined', async () => {
    const { result } = renderHook(() => useAvatar(undefined));

    // loadData returns early when !userId
    await new Promise(r => setTimeout(r, 50));
    expect(mockGetAvatarItems).not.toHaveBeenCalled();
    expect(mockGetUserAvatar).not.toHaveBeenCalled();
  });
});
