import { useState, useEffect, useCallback } from 'react';

export interface DepositEntry {
  id: number;
  amount: number;
  created_at: string;
}

export interface SavingsGoalData {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
  deposits: DepositEntry[];
}

export function getProjectedCompletion(goal: SavingsGoalData): string {
  if (goal.current_amount >= goal.target_amount) return 'Completed!';
  if (!goal.deposits || goal.deposits.length < 2) return 'Not enough data';

  const sorted = [...goal.deposits].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const firstDate = new Date(sorted[0].created_at).getTime();
  const lastDate = new Date(sorted[sorted.length - 1].created_at).getTime();
  const daysDiff = Math.max((lastDate - firstDate) / (1000 * 60 * 60 * 24), 1);
  const totalDeposited = sorted.reduce((sum, d) => sum + d.amount, 0);
  const dailyRate = totalDeposited / daysDiff;

  if (dailyRate <= 0) return 'Not enough data';

  const remaining = goal.target_amount - goal.current_amount;
  const daysLeft = Math.ceil(remaining / dailyRate);
  const projectedDate = new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000);
  return projectedDate.toLocaleDateString();
}

export function useSavingsGoals(userId: number) {
  const [goals, setGoals] = useState<SavingsGoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/finance/savings/${userId}`);
      const json = await res.json();
      if (json.success) {
        setGoals(json.data.goals ?? []);
      }
    } catch {
      setError('Failed to load savings goals');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const createGoal = async (name: string, targetAmount: number): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name, targetAmount }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchGoals();
        return true;
      }
      return false;
    } catch {
      setError('Failed to create savings goal');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const addDeposit = async (goalId: number, amount: number): Promise<boolean> => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/savings/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchGoals();
        return true;
      }
      return false;
    } catch {
      setError('Failed to add deposit');
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return {
    goals,
    loading,
    submitting,
    error,
    setError,
    createGoal,
    addDeposit,
  };
}
