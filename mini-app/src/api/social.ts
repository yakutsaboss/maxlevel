/**
 * Social API client — dedicated functions for friends and challenges.
 * Uses the same base URL and auth headers as the payments API client.
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

export interface Friend {
  id: number;
  username: string | null;
  first_name: string;
  current_level: number;
  total_xp: number;
  is_active: boolean;
  friends_since: string;
}

export interface PendingRequest {
  id: number;
  from_user: {
    id: number;
    username: string | null;
    first_name: string;
    current_level: number;
  };
  created_at: string;
}

export interface Challenge {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  progress: number;
  participant_count: number;
  is_joined?: boolean;
}

export interface CreateChallengeParams {
  creatorId: number;
  title: string;
  description?: string | null;
  mode?: string | null;
  targetValue?: number | null;
  endDate?: string | null;
}

// --- User Search ---

export interface SearchUser {
  id: number;
  username: string | null;
  first_name: string;
  current_level: number;
  total_xp: number;
}

export async function searchUsers(query: string): Promise<SearchUser[]> {
  return request<SearchUser[]>(
    `${API_BASE_URL}/social/users/search?q=${encodeURIComponent(query)}`,
  );
}

// --- Friends ---

export async function getFriends(userId: number): Promise<Friend[]> {
  return request<Friend[]>(`${API_BASE_URL}/social/friends/${userId}`);
}

export async function getPendingRequests(userId: number): Promise<PendingRequest[]> {
  return request<PendingRequest[]>(`${API_BASE_URL}/social/friends/pending/${userId}`);
}

export async function sendFriendRequest(fromUserId: number, toUserId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/friends/request`, {
    method: 'POST',
    body: JSON.stringify({ fromUserId, toUserId }),
  });
}

export async function acceptFriendRequest(requestId: number, userId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/friends/accept`, {
    method: 'POST',
    body: JSON.stringify({ requestId, userId }),
  });
}

export async function rejectFriendRequest(requestId: number, userId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/friends/reject`, {
    method: 'POST',
    body: JSON.stringify({ requestId, userId }),
  });
}

export async function removeFriend(userId: number, friendId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/friends/${userId}/${friendId}`, {
    method: 'DELETE',
  });
}

// --- Challenges ---

export async function getChallenges(userId: number): Promise<Challenge[]> {
  return request<Challenge[]>(`${API_BASE_URL}/social/challenges/${userId}`);
}

export async function createChallenge(data: CreateChallengeParams): Promise<Challenge> {
  return request<Challenge>(`${API_BASE_URL}/social/challenges/create`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function joinChallenge(challengeId: number, userId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/challenges/${challengeId}/join`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function updateChallengeProgress(
  challengeId: number,
  userId: number,
  progress: number,
): Promise<void> {
  await request(`${API_BASE_URL}/social/challenges/${challengeId}/progress`, {
    method: 'PATCH',
    body: JSON.stringify({ userId, progress }),
  });
}

// --- Challenge Discovery ---

export interface DiscoverChallenge {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  creator: { username: string | null; first_name: string };
  participant_count: number;
}

export interface ChallengeDetail {
  id: number;
  title: string;
  description: string | null;
  mode: string | null;
  target_value: number | null;
  start_date: string;
  end_date: string | null;
  status: string;
  creator: { username: string | null; first_name: string };
  participant_count: number;
  participants: Array<{
    user_id: number;
    username: string | null;
    first_name: string;
    current_level: number;
    progress: number;
    joined_at: string;
  }>;
}

export async function discoverChallenges(mode?: string): Promise<DiscoverChallenge[]> {
  const params = new URLSearchParams();
  if (mode) params.set('mode', mode);
  const qs = params.toString();
  return request<DiscoverChallenge[]>(
    `${API_BASE_URL}/social/challenges/discover${qs ? `?${qs}` : ''}`,
  );
}

export async function getChallengeDetails(challengeId: number): Promise<ChallengeDetail> {
  return request<ChallengeDetail>(
    `${API_BASE_URL}/social/challenges/${challengeId}/details`,
  );
}

// --- Challenge Leaderboard ---

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  first_name: string;
  username: string | null;
  current_level: number;
  current_progress: number;
  target_value: number | null;
  percentage: number | null;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
}

export async function getChallengeLeaderboard(challengeId: number, userId?: number): Promise<LeaderboardResponse> {
  const params = new URLSearchParams();
  if (userId) params.set('userId', String(userId));
  const qs = params.toString();
  return request<LeaderboardResponse>(
    `${API_BASE_URL}/social/challenges/${challengeId}/leaderboard${qs ? `?${qs}` : ''}`,
  );
}

export async function leaveChallenge(challengeId: number, userId: number): Promise<void> {
  await request(`${API_BASE_URL}/social/challenges/${challengeId}/leave`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
}
