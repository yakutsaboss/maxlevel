import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock apiClient
vi.mock('@/api/client', () => ({
  apiClient: {
    getUserPreferences: vi.fn(),
    getPunishmentSettings: vi.fn(),
    updateUserPreferences: vi.fn(),
    updatePunishmentSettings: vi.fn(),
    deleteAccount: vi.fn(),
  },
}));

// Mock detectTimezone and DEFAULT_NOTIFICATION_MODES from NotificationSettings
vi.mock('@/components/settings/NotificationSettings', () => ({
  detectTimezone: () => 'America/New_York',
  DEFAULT_NOTIFICATION_MODES: {
    fitness: true,
    hydration: true,
    finance: true,
    learning: true,
    medication: true,
    habits: true,
  },
}));

import { apiClient } from '@/api/client';
import { useSettingsData } from '@/hooks/useSettingsData';

const mockGetUserPreferences = vi.mocked(apiClient.getUserPreferences);
const mockGetPunishmentSettings = vi.mocked(apiClient.getPunishmentSettings);
const mockUpdateUserPreferences = vi.mocked(apiClient.updateUserPreferences);

const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};

const defaultParams = {
  user: { id: 123 },
  haptic: mockHaptic,
  showConfirm: vi.fn().mockResolvedValue(false),
  navigate: vi.fn(),
  queryClient: { clear: vi.fn() },
  onboardingStore: { reset: vi.fn() },
};

const mockPrefsResponse = {
  success: true,
  data: {
    notification_enabled: true,
    reminder_time: 18,
    timezone: 'Europe/Moscow',
    dnd_enabled: false,
    dnd_start: 22,
    dnd_end: 8,
  },
};

const mockPunishmentResponse = {
  success: true,
  data: {
    consent_given: true,
    intensity_level: 'high',
    safe_mode: false,
  },
};

describe('useSettingsData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state', () => {
    mockGetUserPreferences.mockReturnValue(new Promise(() => {})); // never resolves
    mockGetPunishmentSettings.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSettingsData(defaultParams));

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(false);
  });

  it('loads preferences and punishment settings successfully', async () => {
    mockGetUserPreferences.mockResolvedValue(mockPrefsResponse as any);
    mockGetPunishmentSettings.mockResolvedValue(mockPunishmentResponse as any);

    const { result } = renderHook(() => useSettingsData(defaultParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(false);
    expect(result.current.prefs.timezone).toBe('Europe/Moscow');
    expect(result.current.punishment.consent_given).toBe(true);
    expect(result.current.punishment.intensity_level).toBe('high');
  });

  it('sets error state on fetch failure', async () => {
    mockGetUserPreferences.mockRejectedValue(new Error('Network error'));
    mockGetPunishmentSettings.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useSettingsData(defaultParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(true);
  });

  it('handleSave calls API with correct preferences', async () => {
    mockGetUserPreferences.mockResolvedValue(mockPrefsResponse as any);
    mockGetPunishmentSettings.mockResolvedValue(mockPunishmentResponse as any);
    mockUpdateUserPreferences.mockResolvedValue({ success: true } as any);

    const { result } = renderHook(() => useSettingsData(defaultParams));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockUpdateUserPreferences).toHaveBeenCalledWith(123, expect.objectContaining({
      notification_enabled: true,
      reminder_time: 18,
      timezone: 'Europe/Moscow',
    }));
    expect(mockHaptic.impact).toHaveBeenCalledWith('medium');
  });

  it('handles undefined user gracefully', async () => {
    const params = { ...defaultParams, user: undefined };

    const { result } = renderHook(() => useSettingsData(params));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockGetUserPreferences).not.toHaveBeenCalled();
  });
});
