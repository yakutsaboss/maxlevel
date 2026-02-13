import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSavingsGoals, getProjectedCompletion, type SavingsGoalData } from '@/components/finance/useSavingsGoals';

beforeEach(() => {
  vi.restoreAllMocks();
});

function mockFetchOnce(data: unknown) {
  vi.spyOn(global, 'fetch').mockResolvedValueOnce({
    json: async () => data,
  } as Response);
}

function mockFetchSequence(...responses: unknown[]) {
  const spy = vi.spyOn(global, 'fetch');
  for (const data of responses) {
    spy.mockResolvedValueOnce({
      json: async () => data,
    } as Response);
  }
  return spy;
}

const makeGoal = (overrides: Partial<SavingsGoalData> = {}): SavingsGoalData => ({
  id: 1,
  name: 'Emergency Fund',
  target_amount: 10000,
  current_amount: 4500,
  created_at: '2026-01-01',
  deposits: [
    { id: 1, amount: 2000, created_at: '2026-01-05' },
    { id: 2, amount: 1500, created_at: '2026-01-15' },
    { id: 3, amount: 1000, created_at: '2026-01-25' },
  ],
  ...overrides,
});

// --- getProjectedCompletion (pure function) ---

describe('getProjectedCompletion', () => {
  it('returns "Completed!" when current >= target', () => {
    const goal = makeGoal({ current_amount: 10000, target_amount: 10000 });
    expect(getProjectedCompletion(goal)).toBe('Completed!');
  });

  it('returns "Completed!" when current exceeds target', () => {
    const goal = makeGoal({ current_amount: 15000, target_amount: 10000 });
    expect(getProjectedCompletion(goal)).toBe('Completed!');
  });

  it('returns "Not enough data" with fewer than 2 deposits', () => {
    const goal = makeGoal({ deposits: [{ id: 1, amount: 100, created_at: '2026-01-01' }] });
    expect(getProjectedCompletion(goal)).toBe('Not enough data');
  });

  it('returns "Not enough data" with empty deposits', () => {
    const goal = makeGoal({ deposits: [] });
    expect(getProjectedCompletion(goal)).toBe('Not enough data');
  });

  it('returns a date string for valid deposits with progress', () => {
    const goal = makeGoal();
    const result = getProjectedCompletion(goal);
    // Should be a locale date string, not one of the special messages
    expect(result).not.toBe('Completed!');
    expect(result).not.toBe('Not enough data');
    expect(result.length).toBeGreaterThan(0);
  });

  it('calculates based on deposit rate across time span', () => {
    // 2 deposits: 500 on day 0, 500 on day 10 => 1000 total over 10 days => 100/day
    // remaining = 5000 - 1000 = 4000 => 40 days
    const goal = makeGoal({
      current_amount: 1000,
      target_amount: 5000,
      deposits: [
        { id: 1, amount: 500, created_at: '2026-01-01' },
        { id: 2, amount: 500, created_at: '2026-01-11' },
      ],
    });
    const result = getProjectedCompletion(goal);
    expect(result).not.toBe('Not enough data');
    expect(result).not.toBe('Completed!');
  });
});

// --- useSavingsGoals hook ---

describe('useSavingsGoals', () => {
  it('starts in loading state with empty goals', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useSavingsGoals(123));

    expect(result.current.loading).toBe(true);
    expect(result.current.goals).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it('fetches goals on mount and populates state', async () => {
    const goals = [makeGoal()];
    mockFetchOnce({ success: true, data: { goals } });

    const { result } = renderHook(() => useSavingsGoals(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.goals).toEqual(goals);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/finance/savings/123');
  });

  it('sets empty array when API returns no goals', async () => {
    mockFetchOnce({ success: true, data: { goals: [] } });

    const { result } = renderHook(() => useSavingsGoals(456));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.goals).toEqual([]);
  });

  it('handles null goals gracefully (defaults to [])', async () => {
    mockFetchOnce({ success: true, data: { goals: null } });

    const { result } = renderHook(() => useSavingsGoals(456));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.goals).toEqual([]);
  });

  it('sets error when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useSavingsGoals(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load savings goals');
    expect(result.current.goals).toEqual([]);
  });

  it('createGoal sends POST and refetches on success', async () => {
    const goals = [makeGoal()];
    // 1st call: initial fetch, 2nd: createGoal POST, 3rd: refetch
    const spy = mockFetchSequence(
      { success: true, data: { goals: [] } },
      { success: true },
      { success: true, data: { goals } },
    );

    const { result } = renderHook(() => useSavingsGoals(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.createGoal('Emergency Fund', 10000);
    });

    expect(success!).toBe(true);
    expect(spy).toHaveBeenCalledWith('/api/finance/savings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 123, name: 'Emergency Fund', targetAmount: 10000 }),
    });

    await waitFor(() => {
      expect(result.current.goals).toEqual(goals);
    });
  });

  it('createGoal returns false and sets error on failure', async () => {
    mockFetchSequence(
      { success: true, data: { goals: [] } },
    );

    const { result } = renderHook(() => useSavingsGoals(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

    let success: boolean;
    await act(async () => {
      success = await result.current.createGoal('Fund', 5000);
    });

    expect(success!).toBe(false);
    expect(result.current.error).toBe('Failed to create savings goal');
  });

  it('addDeposit sends PATCH and refetches on success', async () => {
    const updatedGoal = makeGoal({ current_amount: 5500 });
    const spy = mockFetchSequence(
      { success: true, data: { goals: [makeGoal()] } },
      { success: true },
      { success: true, data: { goals: [updatedGoal] } },
    );

    const { result } = renderHook(() => useSavingsGoals(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.addDeposit(1, 1000);
    });

    expect(success!).toBe(true);
    expect(spy).toHaveBeenCalledWith('/api/finance/savings/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    });

    await waitFor(() => {
      expect(result.current.goals[0].current_amount).toBe(5500);
    });
  });

  it('addDeposit returns false and sets error on failure', async () => {
    mockFetchSequence({ success: true, data: { goals: [makeGoal()] } });

    const { result } = renderHook(() => useSavingsGoals(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

    let success: boolean;
    await act(async () => {
      success = await result.current.addDeposit(1, 500);
    });

    expect(success!).toBe(false);
    expect(result.current.error).toBe('Failed to add deposit');
  });

  it('setError allows clearing the error state', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useSavingsGoals(123));
    await waitFor(() => expect(result.current.error).toBe('Failed to load savings goals'));

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });
});
