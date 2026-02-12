import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, PieChart, Loader2 } from 'lucide-react';

interface BudgetEntry {
  id: number;
  category: string;
  amount: number;
  type: 'income' | 'expense';
  created_at: string;
}

interface BudgetSummary {
  total_income: number;
  total_expense: number;
  balance: number;
  entries: BudgetEntry[];
  by_category: Record<string, number>;
}

interface BudgetTrackerProps {
  userId: number;
}

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Housing', 'Entertainment',
  'Health', 'Education', 'Shopping', 'Bills', 'Other',
];

const CATEGORY_COLORS: Record<string, string> = {
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

/** Budget tracker component for managing income and expenses */
export function BudgetTracker({ userId }: BudgetTrackerProps) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/finance/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          category: formType === 'income' ? 'Income' : category,
          amount: parsedAmount,
          type: formType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAmount('');
        setShowForm(false);
        await fetchBudget();
      }
    } catch {
      setError('Failed to save budget entry');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" />
      </div>
    );
  }

  const totalIncome = summary?.total_income ?? 0;
  const totalExpense = summary?.total_expense ?? 0;
  const balance = summary?.balance ?? 0;
  const spentPercent = totalIncome > 0 ? Math.min((totalExpense / totalIncome) * 100, 100) : 0;
  const byCategory = summary?.by_category ?? {};

  return (
    <div className="space-y-4">
      {/* Monthly Summary */}
      <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          Monthly Budget Summary
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-500/10 flex items-center justify-center mb-1">
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-telegram-text">{totalIncome.toLocaleString()}</div>
            <div className="text-[10px] text-telegram-hint">Income</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-red-500/10 flex items-center justify-center mb-1">
              <TrendingDown size={16} className="text-red-500" />
            </div>
            <div className="text-lg font-bold text-telegram-text">{totalExpense.toLocaleString()}</div>
            <div className="text-[10px] text-telegram-hint">Expenses</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-telegram-button/10 flex items-center justify-center mb-1">
              <DollarSign size={16} className="text-telegram-button" />
            </div>
            <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {balance.toLocaleString()}
            </div>
            <div className="text-[10px] text-telegram-hint">Balance</div>
          </motion.div>
        </div>

        {/* Spending progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-telegram-hint">
            <span>Spent</span>
            <span>{spentPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-telegram-bg rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${spentPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${
                spentPercent > 90 ? 'bg-red-500' : spentPercent > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(byCategory).length > 0 && (
        <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <PieChart size={14} className="text-telegram-hint" />
            <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
              Category Breakdown
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(byCategory)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, catAmount], idx) => {
                const catPercent = totalExpense > 0 ? (catAmount / totalExpense) * 100 : 0;
                return (
                  <motion.div
                    key={cat}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="flex items-center gap-3"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${CATEGORY_COLORS[cat] ?? 'bg-gray-400'}`} />
                    <span className="text-sm text-telegram-text flex-1">{cat}</span>
                    <span className="text-xs text-telegram-hint">{catPercent.toFixed(0)}%</span>
                    <span className="text-sm font-medium text-telegram-text w-20 text-right">
                      {catAmount.toLocaleString()}
                    </span>
                  </motion.div>
                );
              })}
          </div>
        </div>
      )}

      {/* Add Entry Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowForm((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-telegram-button text-telegram-buttonText rounded-xl font-medium text-sm"
      >
        <PlusCircle size={16} />
        {showForm ? 'Cancel' : 'Add Entry'}
      </motion.button>

      {/* Input Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3 overflow-hidden"
          >
            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormType('expense')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'expense'
                    ? 'bg-red-500 text-white'
                    : 'bg-telegram-bg text-telegram-hint'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFormType('income')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  formType === 'income'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-telegram-bg text-telegram-hint'
                }`}
              >
                Income
              </button>
            </div>

            {/* Category Select (expense only) */}
            {formType === 'expense' && (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full py-2 px-3 bg-telegram-bg text-telegram-text rounded-lg text-sm border-0 outline-none"
              >
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            {/* Amount Input */}
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
              className="w-full py-2 px-3 bg-telegram-bg text-telegram-text rounded-lg text-sm border-0 outline-none placeholder:text-telegram-hint"
            />

            <motion.button
              type="submit"
              disabled={submitting || !amount}
              whileTap={{ scale: 0.97 }}
              className="w-full py-2.5 bg-telegram-button text-telegram-buttonText rounded-lg font-medium text-sm disabled:opacity-50"
            >
              {submitting ? 'Saving...' : `Add ${formType === 'income' ? 'Income' : 'Expense'}`}
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
