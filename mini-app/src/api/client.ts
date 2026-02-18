import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse, UserStats, User, Mode, Quest, Achievement, UserAchievement, QuestCompleteResponse, CheckinResponse, CheckinListResponse, UserPreferences, PunishmentSettings, PunishmentHistoryResponse, OnboardingState, LeaderboardEntry, Subscription, ChannelStatus, TierInfo, PaymentHistoryEntry, NotificationHistoryEntry } from '@/types';
import { ApiError } from '@/types/errors';

interface RetryableAxiosConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// API Base URL - should come from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Timeout presets
export const TIMEOUT_FAST = 5000;    // User-facing requests (stats, active quests)
export const TIMEOUT_NORMAL = 10000; // Default timeout
export const TIMEOUT_SLOW = 20000;   // Background tasks (analytics, exports)

export function withTimeout(ms: number) {
  return { timeout: ms };
}

class ApiClient {
  private client: AxiosInstance;
  private inflightGets = new Map<string, Promise<unknown>>();

  private deduplicatedGet<T>(url: string, params?: Record<string, unknown>, config?: { timeout?: number; signal?: AbortSignal }): Promise<T> {
    const key = params ? `${url}?${JSON.stringify(params, Object.keys(params).sort())}` : url;
    const existing = this.inflightGets.get(key);
    if (existing) return existing as Promise<T>;

    const promise = this.client.get(url, { params, ...config })
      .then((res) => res.data)
      .finally(() => this.inflightGets.delete(key));
    this.inflightGets.set(key, promise);
    return promise;
  }

  clearCache(): void {
    this.inflightGets.clear();
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include Telegram initData
    this.client.interceptors.request.use(
      (config) => {
        // Get initData from Telegram WebApp
        const initData = window.Telegram?.WebApp?.initData;
        if (initData) {
          config.headers['X-Telegram-Init-Data'] = initData;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor with retry for transient errors
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const apiError = ApiError.fromAxios(error);
        const config = error.config as RetryableAxiosConfig | undefined;
        // Retry once on retryable errors (network errors or 5xx)
        if (
          config &&
          !config._retried &&
          apiError.retryable
        ) {
          config._retried = true;
          // Wait 1 second before retry
          await new Promise((r) => setTimeout(r, 1000));
          return this.client(config);
        }
        return Promise.reject(apiError);
      }
    );
  }

  // User endpoints
  async getUserStats(telegramId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<UserStats>> {
    return this.deduplicatedGet(`/users/${telegramId}/stats`, undefined, { ...withTimeout(TIMEOUT_FAST), ...config });
  }

  async createUser(userData: {
    telegram_id: number;
    username?: string;
    first_name: string;
    last_name?: string;
  }): Promise<ApiResponse<{ message: string; user: User }>> {
    const response = await this.client.post('/users', userData);
    return response.data;
  }

  // Quest endpoints
  async getActiveQuests(userId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<Quest[]>> {
    const result = await this.deduplicatedGet<ApiResponse<Quest[]>>(`/users/${userId}/quests/active`, undefined, { ...withTimeout(TIMEOUT_FAST), ...config });
    // Defensive: unwrap if data is not an array but has .quests
    if (result.data && !Array.isArray(result.data)) {
      const wrapped = result.data as unknown as { quests?: Quest[] };
      result.data = Array.isArray(wrapped.quests) ? wrapped.quests : [];
    }
    return result;
  }

  async getCompletedQuests(userId: number, limit = 20, config?: { signal?: AbortSignal }): Promise<ApiResponse<Quest[]>> {
    const result = await this.deduplicatedGet<ApiResponse<Quest[]>>(`/users/${userId}/quests/completed`, { limit }, config);
    // Defensive: unwrap if data is not an array but has .quests
    if (result.data && !Array.isArray(result.data)) {
      const wrapped = result.data as unknown as { quests?: Quest[] };
      result.data = Array.isArray(wrapped.quests) ? wrapped.quests : [];
    }
    return result;
  }

  async completeQuest(questId: number, progress: number): Promise<ApiResponse<QuestCompleteResponse>> {
    const response = await this.client.post(`/quests/${questId}/complete`, {
      progress,
    });
    return response.data;
  }

  // Check-in endpoints
  async createCheckin(telegramId: number, questInstanceId: number, notes?: string): Promise<ApiResponse<CheckinResponse>> {
    const response = await this.client.post('/checkins', { telegram_id: telegramId, quest_instance_id: questInstanceId, notes });
    return response.data;
  }

  async getTodayCheckins(telegramId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<CheckinListResponse>> {
    return this.deduplicatedGet(`/checkins/${telegramId}/today`, undefined, config);
  }

  // Achievement endpoints
  async getAchievements(config?: { signal?: AbortSignal }): Promise<ApiResponse<Achievement[]>> {
    return this.deduplicatedGet('/achievements', undefined, config);
  }

  async getUserAchievements(userId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<UserAchievement[]>> {
    return this.deduplicatedGet(`/users/${userId}/achievements`, undefined, config);
  }

  async checkAchievements(userId: number): Promise<ApiResponse<{ newAchievements: Achievement[]; count: number }>> {
    const response = await this.client.post(`/users/${userId}/achievements/check`);
    return response.data;
  }

  // Mode endpoints
  async addUserMode(userId: number, modeId: number): Promise<ApiResponse<{ message: string; modes: Mode[] }>> {
    const response = await this.client.post(`/users/${userId}/modes`, {
      mode_id: modeId,
    });
    return response.data;
  }

  async removeUserMode(userId: number, modeId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.delete(`/users/${userId}/modes/${modeId}`);
    return response.data;
  }

  // User preferences endpoints
  async getUserPreferences(telegramId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<UserPreferences>> {
    return this.deduplicatedGet(`/users/${telegramId}/preferences`, undefined, config);
  }

  async updateUserPreferences(telegramId: number, data: { notification_enabled?: boolean; reminder_time?: number; timezone?: string; dnd_enabled?: boolean; dnd_start?: number; dnd_end?: number; notification_modes?: Record<string, boolean> }): Promise<ApiResponse<UserPreferences>> {
    const response = await this.client.patch(`/users/${telegramId}/preferences`, data);
    return response.data;
  }

  // Notification history
  async getNotificationHistory(userId: number, limit = 20, config?: { signal?: AbortSignal }): Promise<ApiResponse<NotificationHistoryEntry[]>> {
    return this.deduplicatedGet(`/notifications/${userId}`, { limit }, config);
  }

  // User profile update
  async updateUserProfile(telegramId: number, data: { first_name?: string; avatar_id?: number }): Promise<ApiResponse<User>> {
    const response = await this.client.patch(`/users/${telegramId}/profile`, data);
    return response.data;
  }

  // Leaderboard endpoints
  async getLeaderboard(limit = 50, config?: { signal?: AbortSignal }): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.deduplicatedGet('/leaderboard', { limit }, config);
  }

  async getWeeklyLeaderboard(limit = 50, config?: { signal?: AbortSignal }): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.deduplicatedGet('/leaderboard/weekly', { limit }, config);
  }

  async getMonthlyLeaderboard(limit = 50, config?: { signal?: AbortSignal }): Promise<ApiResponse<LeaderboardEntry[]>> {
    return this.deduplicatedGet('/leaderboard/monthly', { limit }, config);
  }

  // Punishment settings endpoints
  async getPunishmentSettings(telegramId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<PunishmentSettings>> {
    return this.deduplicatedGet(`/punishment/${telegramId}/settings`, undefined, config);
  }

  async updatePunishmentSettings(telegramId: number, data: { consent_given?: boolean; intensity_level?: string; safe_mode?: boolean }): Promise<ApiResponse<PunishmentSettings>> {
    const response = await this.client.patch(`/punishment/${telegramId}/settings`, data);
    return response.data;
  }

  // Punishment history endpoint
  async getPunishmentHistory(telegramId: number, page = 1, limit = 5, config?: { signal?: AbortSignal }): Promise<ApiResponse<PunishmentHistoryResponse>> {
    return this.deduplicatedGet(`/punishment/${telegramId}/history`, { page, limit }, config);
  }

  // Onboarding endpoints
  async getOnboardingState(telegramId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<OnboardingState>> {
    return this.deduplicatedGet(`/onboarding/${telegramId}`, undefined, config);
  }

  async saveOnboardingState(telegramId: number, currentStep: string, quizData: Record<string, unknown>): Promise<ApiResponse<OnboardingState>> {
    const response = await this.client.put(`/onboarding/${telegramId}`, {
      current_step: currentStep,
      quiz_data: quizData,
    });
    return response.data;
  }

  async completeOnboarding(telegramId: number, quizData: Record<string, unknown>): Promise<ApiResponse<{ xp_awarded: number }>> {
    const response = await this.client.post(`/onboarding/${telegramId}/complete`, {
      quiz_data: quizData,
    });
    return response.data;
  }

  // Subscription endpoints
  async getSubscription(userId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<Subscription>> {
    return this.deduplicatedGet(`/payments/subscription/${userId}`, undefined, { ...withTimeout(TIMEOUT_FAST), ...config });
  }

  async getChannelStatus(userId: number, config?: { signal?: AbortSignal }): Promise<ApiResponse<ChannelStatus>> {
    return this.deduplicatedGet(`/channel/${userId}/status`, undefined, { ...withTimeout(TIMEOUT_FAST), ...config });
  }

  async refreshChannelStatus(userId: number): Promise<ApiResponse<ChannelStatus>> {
    const response = await this.client.post(`/channel/${userId}/refresh`);
    return response.data;
  }

  async getTiers(config?: { signal?: AbortSignal }): Promise<ApiResponse<TierInfo[]>> {
    return this.deduplicatedGet('/payments/tiers', undefined, config);
  }

  async getPaymentHistory(userId: number, limit = 50, offset = 0, config?: { signal?: AbortSignal }): Promise<ApiResponse<{ payments: PaymentHistoryEntry[]; count: number }>> {
    return this.deduplicatedGet(`/payments/history/${userId}`, { limit, offset }, config);
  }

  async upgradeSubscription(userId: number, tier: string): Promise<ApiResponse<{ subscription_id: number; tier: string; expires_at: string }>> {
    const response = await this.client.post('/payments/subscription/upgrade', { userId, tier });
    return response.data;
  }

  async cancelSubscription(userId: number): Promise<ApiResponse<{ previous_tier: string; tier: string; auto_renew: boolean }>> {
    const response = await this.client.post('/payments/subscription/cancel', { userId });
    return response.data;
  }

  // Account deletion
  async deleteAccount(telegramId: number): Promise<ApiResponse<{ message: string }>> {
    const response = await this.client.delete(`/users/${telegramId}/account`);
    return response.data;
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
