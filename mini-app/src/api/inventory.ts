/**
 * Inventory API client — fetches user-owned items and handles equip/unequip.
 * Follows the same pattern as shop.ts (standalone fetch with auth headers).
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

export interface InventoryItem {
  purchase_id: number;
  shop_item_id: number;
  name: string;
  description: string | null;
  type: string;
  rarity: string;
  icon_emoji: string | null;
  is_equipped: boolean;
  payment_method: string;
  amount_paid: number;
  purchased_at: string;
}

export interface InventoryResponse {
  items: InventoryItem[];
  grouped: Record<string, InventoryItem[]>;
  totalCount: number;
}

export interface EquipResult {
  equipped: boolean;
  itemId: number;
}

// --- API Functions ---

/**
 * GET /inventory/:userId — Fetch user's owned items grouped by type.
 */
export async function fetchInventory(userId: number): Promise<InventoryResponse> {
  return request<InventoryResponse>(`${API_BASE_URL}/inventory/${userId}`);
}

/**
 * POST /inventory/:userId/equip — Equip an avatar item.
 */
export async function equipItem(userId: number, itemId: number): Promise<EquipResult> {
  return request<EquipResult>(`${API_BASE_URL}/inventory/${userId}/equip`, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

/**
 * POST /inventory/:userId/unequip — Unequip an avatar item.
 */
export async function unequipItem(userId: number, itemId: number): Promise<EquipResult> {
  return request<EquipResult>(`${API_BASE_URL}/inventory/${userId}/unequip`, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}
