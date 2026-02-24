/**
 * Shop API client — dedicated functions for the shop / purchase flow.
 * Follows the same pattern as trophies.ts (standalone fetch with auth headers).
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

export type ShopItemType = 'achievement' | 'avatar_item' | 'trophy_booster' | 'xp_booster';
export type ShopItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type PaymentMethod = 'stars' | 'xp';

export interface ShopItem {
  id: number;
  type: ShopItemType;
  reference_id: number | null;
  name: string;
  description: string | null;
  price_stars: number;
  price_xp: number;
  is_featured: boolean;
  is_active: boolean;
  rarity: ShopItemRarity;
  icon_emoji: string | null;
  sort_order: number;
  created_at: string;
  purchase_count?: number;
}

export interface Purchase {
  id: number;
  user_id: number;
  shop_item_id: number;
  payment_method: PaymentMethod;
  amount_paid: number;
  purchased_at: string;
  item?: ShopItem;
}

export interface PurchaseRequest {
  userId: number;
  itemId: number;
  paymentMethod: PaymentMethod;
}

export interface PurchaseResult {
  purchase: Purchase;
  newBalance: {
    stars?: number;
    xp?: number;
  };
}

// --- API Functions ---

/**
 * GET /shop/items — List all active shop items.
 * Optional filters: type, featured.
 */
export async function fetchShopItems(
  type?: ShopItemType,
  featured?: boolean,
): Promise<ShopItem[]> {
  const params = new URLSearchParams();
  if (type) params.set('type', type);
  if (featured !== undefined) params.set('featured', String(featured));

  const qs = params.toString();
  const url = `${API_BASE_URL}/shop/items${qs ? `?${qs}` : ''}`;
  return request<ShopItem[]>(url);
}

/**
 * GET /shop/items/:itemId — Get single shop item details.
 */
export async function fetchShopItem(itemId: number): Promise<ShopItem> {
  return request<ShopItem>(`${API_BASE_URL}/shop/items/${itemId}`);
}

/**
 * POST /shop/purchase — Purchase an item with Stars or XP.
 */
export async function purchaseItem(
  userId: number,
  itemId: number,
  paymentMethod: PaymentMethod,
): Promise<PurchaseResult> {
  return request<PurchaseResult>(`${API_BASE_URL}/shop/purchase`, {
    method: 'POST',
    body: JSON.stringify({ userId, itemId, paymentMethod } satisfies PurchaseRequest),
  });
}

/**
 * GET /shop/purchases/:userId — List user's purchase history.
 */
export async function fetchPurchaseHistory(userId: number): Promise<Purchase[]> {
  return request<Purchase[]>(`${API_BASE_URL}/shop/purchases/${userId}`);
}

// --- Stars Invoice ---

export interface ShopInvoiceResponse {
  payment_id: number;
  invoice_url: string;
}

/**
 * POST /payments/create-shop-invoice — Create a Telegram Stars invoice for a shop item.
 * Returns payment_id + invoice_url to open via WebApp.openInvoice().
 */
export async function createShopInvoice(
  telegramId: number,
  shopItemId: number,
): Promise<ShopInvoiceResponse> {
  return request<ShopInvoiceResponse>(`${API_BASE_URL}/payments/create-shop-invoice`, {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId, shop_item_id: shopItemId }),
  });
}
