/**
 * Trophy API client — dedicated functions for trophy case feature.
 * Follows the same pattern as avatars.ts (standalone fetch with auth headers).
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

export interface Trophy {
  id: number;
  name: string;
  description: string;
  icon_emoji: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  criteria: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export interface UserTrophy {
  id: number;
  user_id: number;
  trophy_id: number;
  earned_at: string;
  trophy?: Trophy;
}

export interface TrophyCheckResult {
  newTrophies: UserTrophy[];
  count: number;
}

// --- API Functions ---

/** GET /trophies — fetch the full trophy catalog. */
export async function fetchAllTrophies(): Promise<Trophy[]> {
  return request<Trophy[]>(`${API_BASE_URL}/trophies`);
}

/** GET /trophies/:userId — fetch trophies earned by a specific user. */
export async function fetchUserTrophies(userId: number): Promise<UserTrophy[]> {
  return request<UserTrophy[]>(`${API_BASE_URL}/trophies/${userId}`);
}

/** GET /trophies/:userId/check — check & award any newly earned trophies. */
export async function checkTrophies(userId: number): Promise<TrophyCheckResult> {
  return request<TrophyCheckResult>(`${API_BASE_URL}/trophies/${userId}/check`);
}
