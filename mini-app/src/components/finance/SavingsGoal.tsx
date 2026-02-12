import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, PlusCircle, Calendar, TrendingUp, Loader2, Wallet } from 'lucide-react';

interface SavingsGoalData {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  created_at: string;
  deposits: DepositEntry[];
}

interface DepositEntry {
  id: number;
  amount: number;
  created_at: string;
}

interface SavingsGoalProps {
  userId: number;
}

/** Savings goal dashboard component for tracking progress toward financial goals */
export function SavingsGoal({ userId }: SavingsGoalProps) {
  const [goals, setGoals] = useState<SavingsGoalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<number | null>(null);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
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

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetAmount);
    if (!goalName.trim() || !parsed || parsed <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/savings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, name: goalName.trim(), targetAmount: parsed }),
      });
      const json = await res.json();
      if (json.success) {
        setGoalName('');
        setTargetAmount('');
        setShowNewGoal(false);
        await fetchGoals();
      }
    } catch {
      setError('Failed to create savings goal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeposit = async (goalId: number) => {
    const parsed = parseFloat(depositAmount);
    if (!parsed || parsed <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/savings/${goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parsed }),
      });
      const json = await res.json();
      if (json.success) {
        setDepositAmount('');
        setDepositGoalId(null);
        await fetchGoals();
      }
    } catch {
      setError('Failed to add deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const getProjectedCompletion = (goal: SavingsGoalData): string => {
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Savings Goals
        </h2>
        <span className="text-xs text-telegram-hint">{goals.length} goal{goals.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Goal Cards */}
      {goals.length === 0 && !showNewGoal && (
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center">
          <Target size={32} className="mx-auto text-telegram-hint mb-2" />
          <p className="text-sm text-telegram-hint">No savings goals yet</p>
          <p className="text-xs text-telegram-hint mt-1">Create your first goal to start saving!</p>
        </div>
      )}

      {goals.map((goal, idx) => {
        const progress = goal.target_amount > 0
          ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
          : 0;
        const isComplete = goal.current_amount >= goal.target_amount;

        return (
          <motion.div
            key={goal.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3"
          >
            {/* Goal Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  isComplete ? 'bg-emerald-500/10' : 'bg-telegram-button/10'
                }`}>
                  {isComplete ? (
                    <Target size={16} className="text-emerald-500" />
                  ) : (
                    <Target size={16} className="text-telegram-button" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-telegram-text">{goal.name}</div>
                  <div className="text-[10px] text-telegram-hint">
                    Created {new Date(goal.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              {!isComplete && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDepositGoalId(depositGoalId === goal.id ? null : goal.id)}
                  className="text-telegram-button"
                >
                  <Wallet size={18} />
                </motion.button>
              )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-telegram-text font-medium">
                  {goal.current_amount.toLocaleString()} / {goal.target_amount.toLocaleString()}
                </span>
                <span className={isComplete ? 'text-emerald-500 font-medium' : 'text-telegram-hint'}>
                  {progress.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${isComplete ? 'bg-emerald-500' : 'bg-telegram-button'}`}
                />
              </div>
            </div>

            {/* Projected Completion */}
            <div className="flex items-center gap-2 text-xs text-telegram-hint">
              <Calendar size={12} />
              <span>Projected: {getProjectedCompletion(goal)}</span>
            </div>

            {/* Deposit History */}
            {goal.deposits && goal.deposits.length > 0 && (
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[10px] text-telegram-hint uppercase tracking-wide">
                  <TrendingUp size={10} />
                  <span>Recent deposits</span>
                </div>
                <div className="space-y-1 max-h-24 overflow-y-auto">
                  {goal.deposits.slice(0, 5).map((deposit) => (
                    <div key={deposit.id} className="flex justify-between text-xs">
                      <span className="text-telegram-hint">
                        {new Date(deposit.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-emerald-500 font-medium">
                        +{deposit.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Deposit Form */}
            <AnimatePresence>
              {depositGoalId === goal.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex gap-2 overflow-hidden"
                >
                  <input
                    type="number"
                    placeholder="Deposit amount"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    min="0"
                    step="0.01"
                    className="flex-1 py-2 px-3 bg-telegram-bg text-telegram-text rounded-lg text-sm border-0 outline-none placeholder:text-telegram-hint"
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDeposit(goal.id)}
                    disabled={submitting || !depositAmount}
                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    {submitting ? '...' : 'Add'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {/* Create New Goal Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowNewGoal((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-telegram-button text-telegram-buttonText rounded-xl font-medium text-sm"
      >
        <PlusCircle size={16} />
        {showNewGoal ? 'Cancel' : 'New Savings Goal'}
      </motion.button>

      {/* New Goal Form */}
      <AnimatePresence>
        {showNewGoal && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleCreateGoal}
            className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3 overflow-hidden"
          >
            <input
              type="text"
              placeholder="Goal name (e.g., Emergency Fund)"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              maxLength={100}
              className="w-full py-2 px-3 bg-telegram-bg text-telegram-text rounded-lg text-sm border-0 outline-none placeholder:text-telegram-hint"
            />
            <input
              type="number"
              placeholder="Target amount"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full py-2 px-3 bg-telegram-bg text-telegram-text rounded-lg text-sm border-0 outline-none placeholder:text-telegram-hint"
            />
            <motion.button
              type="submit"
              disabled={submitting || !goalName.trim() || !targetAmount}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 bg-telegram-button text-telegram-buttonText rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Goal'}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-red-500 text-sm text-center"
            onClick={() => setError(null)}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
