import { AnimatePresence, motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useBudget } from '@/components/finance/useBudget';
import { BudgetSummary } from '@/components/finance/BudgetSummary';
import { BudgetForm } from '@/components/finance/BudgetForm';

interface BudgetTrackerProps {
  userId: number;
}

/** Budget tracker component for managing income and expenses */
export function BudgetTracker({ userId }: BudgetTrackerProps) {
  const {
    loading,
    submitting,
    error,
    setError,
    totalIncome,
    totalExpense,
    balance,
    spentPercent,
    byCategory,
    addEntry,
  } = useBudget(userId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading budget">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BudgetSummary
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        balance={balance}
        spentPercent={spentPercent}
        byCategory={byCategory}
      />

      <BudgetForm submitting={submitting} onSubmit={addEntry} />

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
