import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import type { ModeAnalyticsData, ModeDetailData } from '@/components/analytics/useModeAnalytics';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { useModeAnalytics } from '@/components/analytics/useModeAnalytics';

const makeModeData = (overrides: Partial<ModeAnalyticsData> = {}): ModeAnalyticsData => ({
  mode_id: 1,
  mode_name: 'fitness',
  display_name: 'Fitness',
  icon: '',
  completion_rate: 0.75,
  total_quests: 10,
  completed_quests: 7,
  xp_earned: 350,
  streak: { current: 5, longest: 12 },
  ...overrides,
});

const makeModeDetail = (overrides: Partial<ModeDetailData> = {}): ModeDetailData => ({
  mode: { id: 1, name: 'fitness', display_name: 'Fitness', icon: '' },
  progress: { completion_rate: 0.8, total_quests: 10, completed_quests: 8 },
  streak: { current: 5, longest: 12, last_activity: '2026-02-10' },
  weekly_xp: [
    { day: 'Mon', xp: 50 },
    { day: 'Tue', xp: 30 },
    { day: 'Wed', xp: 0 },
  ],
  quest_history: [
    {
      id: 1,
      title: 'Push-ups',
      type: 'daily',
      difficulty: 'easy',
      status: 'completed',
      xp_awarded: 50,
      date: '2026-02-10',
      completed_at: '2026-02-10T12:00:00Z',
      check_ins: 5,
      target: 5,
    },
  ],
  ...overrides,
});

function mockModesResponse(modes: ModeAnalyticsData[] = []) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: modes }),
  });
}

function mockDetailResponse(detail: ModeDetailData) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ data: detail }),
  });
}

describe('useModeAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset Telegram global
    (window as any).Telegram = undefined;
  });

  it('starts in loading state with empty data', () => {
    mockFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useModeAnalytics(123));

    expect(result.current.loading).toBe(true);
    expect(result.current.modesData).toEqual([]);
    expect(result.current.detailData).toBeNull();
    expect(result.current.selectedMode).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('fetches modes list when no initialMode', async () => {
    const modes = [makeModeData(), makeModeData({ mode_id: 2, mode_name: 'hydration' })];
    mockModesResponse(modes);

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.modesData).toHaveLength(2);
    expect(result.current.selectedMode).toBeNull();
    expect(result.current.error).toBeNull();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/analytics/123/modes'),
      expect.any(Object),
    );
  });

  it('fetches mode detail when initialMode is provided', async () => {
    const detail = makeModeDetail();
    mockDetailResponse(detail);

    const { result } = renderHook(() => useModeAnalytics(123, 'fitness'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.selectedMode).toBe('fitness');
    expect(result.current.detailData).toBeTruthy();
    expect(result.current.detailData?.progress.completed_quests).toBe(8);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/analytics/123/modes/fitness'),
      expect.any(Object),
    );
  });

  it('handleSelectMode fetches detail for selected mode', async () => {
    const modes = [makeModeData()];
    mockModesResponse(modes);

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Now select a mode
    const detail = makeModeDetail();
    mockDetailResponse(detail);

    act(() => {
      result.current.handleSelectMode('fitness');
    });

    expect(result.current.selectedMode).toBe('fitness');

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.detailData).toBeTruthy();
  });

  it('handleBack resets to modes list', async () => {
    const detail = makeModeDetail();
    mockDetailResponse(detail);

    const { result } = renderHook(() => useModeAnalytics(123, 'fitness'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Now go back
    const modes = [makeModeData()];
    mockModesResponse(modes);

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.selectedMode).toBeNull();
    expect(result.current.detailData).toBeNull();

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.modesData).toHaveLength(1);
  });

  it('sets error on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('HTTP 500');
  });

  it('sets error on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
  });

  it('retry refetches modes when no mode selected', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Temporary'));

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();

    // Retry
    const modes = [makeModeData()];
    mockModesResponse(modes);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.modesData).toHaveLength(1);
  });

  it('retry refetches detail when mode is selected', async () => {
    // Initial detail fetch fails
    mockFetch.mockRejectedValueOnce(new Error('Temporary'));

    const { result } = renderHook(() => useModeAnalytics(123, 'fitness'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeTruthy();

    // Retry with successful response
    mockDetailResponse(makeModeDetail());

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.detailData).toBeTruthy();
  });

  it('includes Telegram initData header when available', async () => {
    (window as any).Telegram = { WebApp: { initData: 'test-init-data' } };
    mockModesResponse([makeModeData()]);

    const { result } = renderHook(() => useModeAnalytics(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Telegram-Init-Data': 'test-init-data',
        }),
      }),
    );
  });
});
