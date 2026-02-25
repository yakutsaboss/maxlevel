/**
 * Avatar API client — dedicated functions for avatar customization.
 * Uses the same base URL and auth headers as the social API client.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: getAuthHeaders(),
    ...options,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || json.message || 'Request failed');
  }

  return json.data;
}

// --- Types ---

export interface AvatarItem {
  id: number;
  category: string;
  name: string;
  sprite_key: string;
  rarity: string;
  unlock_type: string;
  unlock_criteria: Record<string, unknown>;
  sort_order: number;
  is_animated: boolean;
  animation_data: Record<string, unknown> | null;
  price_stars: number;
}

export interface AvatarShopItem extends AvatarItem {
  is_owned: boolean;
  shop_item_id: number | null;
}

export interface EquippedItems {
  hairstyle: string | null;
  outfit: string | null;
  accessory: string | null;
  background: string | null;
}

// --- API Functions ---

export async function getAvatarItems(): Promise<AvatarItem[]> {
  return request<AvatarItem[]>(`${API_BASE_URL}/avatars/items`);
}

export async function getAvatarShopItems(userId: number): Promise<AvatarShopItem[]> {
  return request<AvatarShopItem[]>(`${API_BASE_URL}/avatars/shop?userId=${userId}`);
}

export async function getUserAvatar(userId: number): Promise<EquippedItems> {
  return request<EquippedItems>(`${API_BASE_URL}/avatars/${userId}`);
}

export async function equipAvatarItem(
  userId: number,
  category: string,
  itemId: number | null,
): Promise<EquippedItems> {
  return request<EquippedItems>(`${API_BASE_URL}/avatars/${userId}/equip`, {
    method: 'PATCH',
    body: JSON.stringify({ category, itemId }),
  });
}
