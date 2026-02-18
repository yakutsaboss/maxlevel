/**
 * Activities API client — fetches activity types and user activity stats.
 * Follows the same standalone-fetch pattern as inventory.ts / shop.ts.
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

export interface ActivityType {
  id: number;
  name: string;
  icon_emoji: string;
  category: string;
  default_duration_minutes: number;
  calories_per_minute: number;
}

export interface ActivityStat {
  activity_type_id: number;
  last_done: string | null;
  times_done: number;
  personal_record_duration: number | null;
  personal_record_calories: number | null;
}

export interface ActivityUserStats {
  activities_this_week: number;
  calories_burned_this_week: number;
  activity_stats: ActivityStat[];
}

// --- API Functions ---

/**
 * GET /activities/types — Fetch all available activity types.
 */
export async function fetchActivityTypes(): Promise<ActivityType[]> {
  return request<ActivityType[]>(`${API_BASE_URL}/activities/types`);
}

/**
 * GET /activities/:userId/stats — Fetch user's activity statistics.
 */
export async function fetchActivityStats(userId: number): Promise<ActivityUserStats> {
  return request<ActivityUserStats>(`${API_BASE_URL}/activities/${userId}/stats`);
}

/**
 * POST /activities/:userId/quick-log — Quick log an activity with default duration.
 */
export async function quickLogActivity(userId: number, activityTypeId: number): Promise<{ logged: boolean; xp_awarded: number }> {
  return request<{ logged: boolean; xp_awarded: number }>(`${API_BASE_URL}/activities/${userId}/quick-log`, {
    method: 'POST',
    body: JSON.stringify({ activity_type_id: activityTypeId }),
  });
}
