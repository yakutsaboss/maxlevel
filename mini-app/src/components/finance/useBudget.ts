import { useState, useEffect, useCallback } from 'react';

export interface BudgetEntry {
  id: number;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
}

export interface BudgetSummaryData {
  total_income: number;
  total_expense: number;
  balance: number;
  entries: BudgetEntry[];
  by_category: Record<string, number>;
}

export const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Entertainment',
  'Health', 'Education', 'Shopping', 'Bills', 'Other',
];

export const CATEGORY_COLORS: Record<string, string> = {
  Food: 'bg-orange-500',
  Transport: 'bg-blue-500',
  Housing: 'bg-purple-500',
  Entertainment: 'bg-pink-500',
  Health: 'bg-green-500',
  Education: 'bg-cyan-500',
  Shopping: 'bg-yellow-500',
  Bills: 'bg-red-500',
  Other: 'bg-gray-500',
  Income: 'bg-emerald-500',
};

export function useBudget(userId: number) {
  const [summary, setSummary] = useState<BudgetSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/budget/${userId}`);
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
      }
    } catch {
      setError('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const addEntry = async (
    type: 'income' | 'expense',
    category: string,
    amount: number,
  ): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          category: type === 'income' ? 'Income' : category,
          amount,
          type,
        }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchBudget();
        return true;
      }
      return false;
    } catch {
      setError('Failed to save budget entry');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const totalIncome = summary?.total_income ?? 0;
  const totalExpense = summary?.total_expense ?? 0;
  const balance = summary?.balance ?? 0;
  const spentPercent = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;
  const byCategory = summary?.by_category ?? {};
  const entries = summary?.entries ?? [];

  return {
    loading,
    submitting,
    error,
    setError,
    totalIncome,
    totalExpense,
    balance,
    spentPercent,
    byCategory,
    entries,
    addEntry,
  };
}
