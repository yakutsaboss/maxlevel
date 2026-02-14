/**
 * Payments API client — dedicated functions for Telegram Stars payment flow.
 * Uses the same base URL and auth headers as the main apiClient.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

function getAuthHeaders(): Record<string, string> {
  const initData = window.Telegram?.WebApp?.initData;
  return initData
    ? { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData }
    : { 'Content-Type': 'application/json' };
}

export interface CreatePaymentResponse {
  payment_id: number;
  invoice_url: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  tier: string;
  created_at: string;
}

export interface PaymentStatusResponse {
  subscription_id?: number;
  tier: string;
  raw_tier?: string;
  is_active: boolean;
  is_expired: boolean;
  started_at?: string;
  expires_at?: string | null;
  auto_renew?: boolean;
}

export interface PaymentHistoryItem {
  id: number;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  provider: string;
  telegram_payment_charge_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/**
 * Create a new pending payment and get the invoice URL / payment ID.
 * Backend: POST /api/payments/create
 */
export async function createPayment(
  userId: number,
  tier: string,
  amount: number,
): Promise<CreatePaymentResponse> {
  const res = await fetch(`${API_BASE_URL}/payments/create`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ userId, amount, tier }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Payment creation failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Payment creation failed');
  }

  return json.data;
}

/**
 * Get the current subscription/payment status for a user.
 * Backend: GET /api/payments/subscription/:userId
 */
export async function getPaymentStatus(userId: number): Promise<PaymentStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/payments/subscription/${userId}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `Status check failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'Status check failed');
  }

  return json.data;
}

/**
 * Get payment history for a user.
 * Backend: GET /api/payments/history/:userId
 */
export async function getPaymentHistory(
  userId: number,
  limit = 50,
): Promise<{ payments: PaymentHistoryItem[]; count: number }> {
  const res = await fetch(`${API_BASE_URL}/payments/history/${userId}?limit=${limit}`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `History fetch failed (${res.status})`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(json.error || 'History fetch failed');
  }

  return json.data;
}
