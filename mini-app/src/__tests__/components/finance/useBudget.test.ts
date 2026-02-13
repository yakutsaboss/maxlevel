import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useBudget, EXPENSE_CATEGORIES, CATEGORY_COLORS } from '@/components/finance/useBudget';

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

const makeSummary = (overrides: Record<string, unknown> = {}) => ({
  total_income: 5000,
  total_expense: 2000,
  balance: 3000,
  entries: [
    { id: 1, category: 'Income', amount: 5000, type: 'income', created_at: '2026-01-01' },
    { id: 2, category: 'Food', amount: 1200, type: 'expense', created_at: '2026-01-05' },
    { id: 3, category: 'Transport', amount: 800, type: 'expense', created_at: '2026-01-10' },
  ],
  by_category: { Food: 1200, Transport: 800 },
  ...overrides,
});

// --- Exported constants ---

describe('EXPENSE_CATEGORIES', () => {
  it('contains expected categories', () => {
    expect(EXPENSE_CATEGORIES).toContain('Food');
    expect(EXPENSE_CATEGORIES).toContain('Transport');
    expect(EXPENSE_CATEGORIES).toContain('Other');
    expect(EXPENSE_CATEGORIES.length).toBe(9);
  });
});

describe('CATEGORY_COLORS', () => {
  it('maps all expense categories plus Income', () => {
    for (const cat of EXPENSE_CATEGORIES) {
      expect(CATEGORY_COLORS[cat]).toBeDefined();
    }
    expect(CATEGORY_COLORS.Income).toBe('bg-emerald-500');
  });
});

// --- useBudget hook ---

describe('useBudget', () => {
  it('starts in loading state with zero values', () => {
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useBudget(123));

    expect(result.current.loading).toBe(true);
    expect(result.current.totalIncome).toBe(0);
    expect(result.current.totalExpense).toBe(0);
    expect(result.current.balance).toBe(0);
    expect(result.current.spentPercent).toBe(0);
    expect(result.current.byCategory).toEqual({});
    expect(result.current.error).toBeNull();
    expect(result.current.submitting).toBe(false);
  });

  it('fetches budget on mount and populates derived values', async () => {
    mockFetchOnce({ success: true, data: makeSummary() });

    const { result } = renderHook(() => useBudget(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.totalIncome).toBe(5000);
    expect(result.current.totalExpense).toBe(2000);
    expect(result.current.balance).toBe(3000);
    // spentPercent: (2000/5000)*100 = 40
    expect(result.current.spentPercent).toBe(40);
    expect(result.current.byCategory).toEqual({ Food: 1200, Transport: 800 });
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith('/api/finance/budget/123');
  });

  it('caps spentPercent at 100 when expenses exceed income', async () => {
    mockFetchOnce({
      success: true,
      data: makeSummary({ total_income: 1000, total_expense: 2000, balance: -1000 }),
    });

    const { result } = renderHook(() => useBudget(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.spentPercent).toBe(100);
  });

  it('spentPercent is 0 when income is 0', async () => {
    mockFetchOnce({
      success: true,
      data: makeSummary({ total_income: 0, total_expense: 0, balance: 0 }),
    });

    const { result } = renderHook(() => useBudget(123));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.spentPercent).toBe(0);
  });

  it('sets error when fetch fails', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBudget(123));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load budget data');
    expect(result.current.totalIncome).toBe(0);
  });

  it('addEntry sends POST with income type (category forced to "Income")', async () => {
    const spy = mockFetchSequence(
      { success: true, data: makeSummary() },
      { success: true },
      { success: true, data: makeSummary({ total_income: 8000, balance: 6000 }) },
    );

    const { result } = renderHook(() => useBudget(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.addEntry('income', 'ignored', 3000);
    });

    expect(success!).toBe(true);
    expect(spy).toHaveBeenCalledWith('/api/finance/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 123, category: 'Income', amount: 3000, type: 'income' }),
    });

    await waitFor(() => {
      expect(result.current.totalIncome).toBe(8000);
    });
  });

  it('addEntry sends POST with expense type (uses provided category)', async () => {
    const spy = mockFetchSequence(
      { success: true, data: makeSummary() },
      { success: true },
      { success: true, data: makeSummary({ total_expense: 2500 }) },
    );

    const { result } = renderHook(() => useBudget(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.addEntry('expense', 'Food', 500);
    });

    expect(success!).toBe(true);
    expect(spy).toHaveBeenCalledWith('/api/finance/budget', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 123, category: 'Food', amount: 500, type: 'expense' }),
    });
  });

  it('addEntry returns false and sets error on failure', async () => {
    mockFetchSequence({ success: true, data: makeSummary() });

    const { result } = renderHook(() => useBudget(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

    let success: boolean;
    await act(async () => {
      success = await result.current.addEntry('expense', 'Food', 100);
    });

    expect(success!).toBe(false);
    expect(result.current.error).toBe('Failed to save budget entry');
  });

  it('addEntry returns false when API returns success: false', async () => {
    mockFetchSequence(
      { success: true, data: makeSummary() },
      { success: false, error: 'Invalid amount' },
    );

    const { result } = renderHook(() => useBudget(123));
    await waitFor(() => expect(result.current.loading).toBe(false));

    let success: boolean;
    await act(async () => {
      success = await result.current.addEntry('expense', 'Food', -10);
    });

    expect(success!).toBe(false);
  });

  it('setError allows clearing the error state', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('fail'));

    const { result } = renderHook(() => useBudget(123));
    await waitFor(() => expect(result.current.error).toBe('Failed to load budget data'));

    act(() => {
      result.current.setError(null);
    });

    expect(result.current.error).toBeNull();
  });
});
