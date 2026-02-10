import axios, { AxiosInstance } from 'axios';
import type { ApiResponse, UserStats, User, Mode, Quest, Achievement, UserAchievement, QuestCompleteResponse, CheckinResponse, CheckinListResponse, UserPreferences, PunishmentSettings, PunishmentHistoryResponse, OnboardingState, LeaderboardEntry } from '@/types';

// API Base URL - should come from environment
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private client: AxiosInstance;

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
      async (error) => {
        const config = error.config;
        // Retry once on network errors or 5xx (but not on 4xx client errors)
        if (
          config &&
          !config._retried &&
          (!error.response || error.response.status >= 500)
        ) {
          config._retried = true;
          // Wait 1 second before retry
          await new Promise((r) => setTimeout(r, 1000));
          return this.client(config);
        }
        return Promise.reject(error);
      }
    );
  }

  // User endpoints
  async getUserStats(telegramId: number): Promise<ApiResponse<UserStats>> {
    const response = await this.client.get(`/users/${telegramId}/stats`);
    return response.data;
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
  async getActiveQuests(userId: number): Promise<ApiResponse<Quest[]>> {
    const response = await this.client.get(`/users/${userId}/quests/active`);
    return response.data;
  }

  async getCompletedQuests(userId: number, limit = 20): Promise<ApiResponse<Quest[]>> {
    const response = await this.client.get(`/users/${userId}/quests/completed`, {
      params: { limit },
    });
    return response.data;
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

  async getTodayCheckins(telegramId: number): Promise<ApiResponse<CheckinListResponse>> {
    const response = await this.client.get(`/checkins/${telegramId}/today`);
    return response.data;
  }

  // Achievement endpoints
  async getAchievements(): Promise<ApiResponse<Achievement[]>> {
    const response = await this.client.get('/achievements');
    return response.data;
  }

  async getUserAchievements(userId: number): Promise<ApiResponse<UserAchievement[]>> {
    const response = await this.client.get(`/users/${userId}/achievements`);
    return response.data;
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
  async getUserPreferences(telegramId: number): Promise<ApiResponse<UserPreferences>> {
    const response = await this.client.get(`/users/${telegramId}/preferences`);
    return response.data;
  }

  async updateUserPreferences(telegramId: number, data: { notification_enabled?: boolean; reminder_time?: number; timezone?: string }): Promise<ApiResponse<UserPreferences>> {
    const response = await this.client.patch(`/users/${telegramId}/preferences`, data);
    return response.data;
  }

  // User profile update
  async updateUserProfile(telegramId: number, data: { first_name?: string; avatar_id?: number }): Promise<ApiResponse<User>> {
    const response = await this.client.patch(`/users/${telegramId}/profile`, data);
    return response.data;
  }

  // Leaderboard endpoints
  async getLeaderboard(limit = 50): Promise<ApiResponse<LeaderboardEntry[]>> {
    const response = await this.client.get('/leaderboard', {
      params: { limit },
    });
    return response.data;
  }

  async getWeeklyLeaderboard(limit = 50): Promise<ApiResponse<LeaderboardEntry[]>> {
    const response = await this.client.get('/leaderboard/weekly', {
      params: { limit },
    });
    return response.data;
  }

  async getMonthlyLeaderboard(limit = 50): Promise<ApiResponse<LeaderboardEntry[]>> {
    const response = await this.client.get('/leaderboard/monthly', {
      params: { limit },
    });
    return response.data;
  }

  // Punishment settings endpoints
  async getPunishmentSettings(telegramId: number): Promise<ApiResponse<PunishmentSettings>> {
    const response = await this.client.get(`/punishment/${telegramId}/settings`);
    return response.data;
  }

  async updatePunishmentSettings(telegramId: number, data: { consent_given?: boolean; intensity_level?: string; safe_mode?: boolean }): Promise<ApiResponse<PunishmentSettings>> {
    const response = await this.client.patch(`/punishment/${telegramId}/settings`, data);
    return response.data;
  }

  // Punishment history endpoint
  async getPunishmentHistory(telegramId: number, page = 1, limit = 5): Promise<ApiResponse<PunishmentHistoryResponse>> {
    const response = await this.client.get(`/punishment/${telegramId}/history?page=${page}&limit=${limit}`);
    return response.data;
  }

  // Onboarding endpoints
  async getOnboardingState(telegramId: number): Promise<ApiResponse<OnboardingState>> {
    const response = await this.client.get(`/onboarding/${telegramId}`);
    return response.data;
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
}

// Export singleton instance
export const apiClient = new ApiClient();
