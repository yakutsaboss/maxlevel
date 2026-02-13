import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

// Mock adminFetch
const mockAdminFetch = vi.fn();
vi.mock('@/api/adminClient', () => ({
  adminFetch: (...args: unknown[]) => mockAdminFetch(...args),
}));

import {
  useAnswerAnalytics,
  formatLabel,
  getBarColor,
  MODE_TABS,
  ANSWER_LABELS,
} from '@/components/admin/answer-analytics/useAnswerAnalytics';
import type { ModeAnalyticsData } from '@/components/admin/answer-analytics/useAnswerAnalytics';

const credentials = 'dGVzdDp0ZXN0';

const makeModeData = (overrides: Partial<ModeAnalyticsData> = {}): ModeAnalyticsData => ({
  mode_id: 1,
  mode_name: 'fitness',
  display_name: 'Fitness',
  icon: '',
  respondent_count: 10,
  questions: [
    {
      key: 'fitness_level',
      label: 'Fitness Level',
      responses: { beginner: 5, intermediate: 3, advanced: 2 },
      most_common: 'beginner',
    },
  ],
  ...overrides,
});

describe('useAnswerAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts in loading state with empty data', () => {
    mockAdminFetch.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.selectedMode).toBe('fitness');
    expect(result.current.expandedQ).toBeNull();
  });

  it('fetches analytics data on mount', async () => {
    const modes = [makeModeData(), makeModeData({ mode_id: 2, mode_name: 'hydration', display_name: 'Hydration' })];

    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ modes }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.error).toBeNull();
    expect(mockAdminFetch).toHaveBeenCalledWith('/analytics', credentials);
  });

  it('resolves currentMode from selectedMode', async () => {
    const fitness = makeModeData({ mode_name: 'fitness' });
    const hydration = makeModeData({ mode_id: 2, mode_name: 'hydration' });

    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ modes: [fitness, hydration] }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Default selectedMode is 'fitness'
    expect(result.current.currentMode?.mode_name).toBe('fitness');
  });

  it('selectMode changes selectedMode and resets expandedQ', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ modes: [makeModeData()] }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // First expand a question
    act(() => {
      result.current.toggleQuestion('fitness_level');
    });
    expect(result.current.expandedQ).toBe('fitness_level');

    // Then select a different mode
    act(() => {
      result.current.selectMode('hydration');
    });
    expect(result.current.selectedMode).toBe('hydration');
    expect(result.current.expandedQ).toBeNull();
  });

  it('toggleQuestion expands and collapses', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ modes: [makeModeData()] }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // Expand
    act(() => {
      result.current.toggleQuestion('fitness_level');
    });
    expect(result.current.expandedQ).toBe('fitness_level');

    // Collapse same key
    act(() => {
      result.current.toggleQuestion('fitness_level');
    });
    expect(result.current.expandedQ).toBeNull();

    // Expand one, then switch to another
    act(() => {
      result.current.toggleQuestion('key_a');
    });
    expect(result.current.expandedQ).toBe('key_a');

    act(() => {
      result.current.toggleQuestion('key_b');
    });
    expect(result.current.expandedQ).toBe('key_b');
  });

  it('sets error on API error response', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Server error');
    expect(result.current.data).toEqual([]);
  });

  it('sets connection error on network failure', async () => {
    mockAdminFetch.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to connect to server');
  });

  it('handles data.data.modes response shape', async () => {
    mockAdminFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { modes: [makeModeData()] } }),
    });

    const { result } = renderHook(() => useAnswerAnalytics(credentials));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toHaveLength(1);
  });
});

describe('formatLabel', () => {
  it('returns known answer label', () => {
    expect(formatLabel('beginner')).toBe('Beginner');
    expect(formatLabel('lose_weight')).toBe('Lose Weight');
  });

  it('returns known question label', () => {
    expect(formatLabel('fitness_level')).toBe('Fitness Level');
    expect(formatLabel('current_intake')).toBe('Current Intake');
  });

  it('falls back to title-cased key for unknown keys', () => {
    expect(formatLabel('some_unknown_key')).toBe('Some Unknown Key');
    expect(formatLabel('hello_world')).toBe('Hello World');
  });
});

describe('getBarColor', () => {
  it('returns correct colors for first 8 indices', () => {
    expect(getBarColor(0)).toBe('bg-blue-500');
    expect(getBarColor(1)).toBe('bg-emerald-500');
    expect(getBarColor(7)).toBe('bg-teal-500');
  });

  it('wraps around for indices beyond 8', () => {
    expect(getBarColor(8)).toBe('bg-blue-500');
    expect(getBarColor(9)).toBe('bg-emerald-500');
  });
});

describe('MODE_TABS', () => {
  it('has 6 mode tabs', () => {
    expect(MODE_TABS).toHaveLength(6);
  });

  it('includes expected modes', () => {
    const names = MODE_TABS.map(t => t.name);
    expect(names).toContain('fitness');
    expect(names).toContain('hydration');
    expect(names).toContain('learning');
  });
});
