import { useMemo } from 'react';
import type { BudgetEntry } from '@/components/finance/useBudget';

export interface DailySpending {
  date: string;
  amount: number;
}

export interface CategorySlice {
  name: string;
  value: number;
  color: string;
}

export interface MonthlyComparison {
  label: string;
  income: number;
  expense: number;
}

const CHART_COLORS: Record<string, string> = {
  Food: '#f97316',
  Transport: '#3b82f6',
  Housing: '#a855f7',
  Entertainment: '#ec4899',
  Health: '#22c55e',
  Education: '#06b6d4',
  Shopping: '#eab308',
  Bills: '#ef4444',
  Other: '#6b7280',
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useFinanceAnalytics(entries: BudgetEntry[]) {
  const dailySpending = useMemo<DailySpending[]>(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const expenseEntries = entries.filter(
      (e) => e.type === 'expense' && new Date(e.created_at) >= thirtyDaysAgo,
    );

    const byDay = new Map<string, number>();

    // Pre-fill all 30 days so chart has no gaps
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, 0);
    }

    for (const entry of expenseEntries) {
      const key = new Date(entry.created_at).toISOString().slice(0, 10);
      if (byDay.has(key)) {
        byDay.set(key, (byDay.get(key) ?? 0) + entry.amount);
      }
    }

    return Array.from(byDay.entries()).map(([date, amount]) => ({
      date: formatDate(date),
      amount,
    }));
  }, [entries]);

  const categoryData = useMemo<CategorySlice[]>(() => {
    const byCategory = new Map<string, number>();

    for (const entry of entries) {
      if (entry.type === 'expense') {
        byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
      }
    }

    return Array.from(byCategory.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value,
        color: CHART_COLORS[name] ?? '#6b7280',
      }));
  }, [entries]);

  const monthlyComparison = useMemo<MonthlyComparison[]>(() => {
    const now = new Date();
    const thisMonthKey = getMonthKey(now.toISOString());
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthKey = getMonthKey(lastMonth.toISOString());

    const months: Record<string, { income: number; expense: number }> = {
      [lastMonthKey]: { income: 0, expense: 0 },
      [thisMonthKey]: { income: 0, expense: 0 },
    };

    for (const entry of entries) {
      const key = getMonthKey(entry.created_at);
      if (months[key]) {
        if (entry.type === 'income') {
          months[key].income += entry.amount;
        } else {
          months[key].expense += entry.amount;
        }
      }
    }

    const lastMonthLabel = lastMonth.toLocaleString('default', { month: 'short' });
    const thisMonthLabel = now.toLocaleString('default', { month: 'short' });

    return [
      { label: lastMonthLabel, ...months[lastMonthKey] },
      { label: thisMonthLabel, ...months[thisMonthKey] },
    ];
  }, [entries]);

  const hasData = entries.length > 0;
  const hasExpenses = entries.some((e) => e.type === 'expense');

  return {
    dailySpending,
    categoryData,
    monthlyComparison,
    hasData,
    hasExpenses,
  };
}
