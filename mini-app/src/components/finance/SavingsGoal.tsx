import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { Target, Loader2 } from 'lucide-react';
import { useSavingsGoals } from '@/components/finance/useSavingsGoals';
import { GoalCard } from '@/components/finance/GoalCard';
import { GoalForm } from '@/components/finance/GoalForm';

interface SavingsGoalProps {
  userId: number;
}

/** Savings goal dashboard component for tracking progress toward financial goals */
export function SavingsGoal({ userId }: SavingsGoalProps) {
  const { t } = useTranslation();
  const { goals, loading, submitting, error, setError, createGoal, addDeposit } = useSavingsGoals(userId);
  const [depositGoalId, setDepositGoalId] = useState<number | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" />
      </div>
    );
  }

  const handleToggleDeposit = (goalId: number) => {
    setDepositGoalId(depositGoalId === goalId ? null : goalId);
  };

  const handleDeposit = async (goalId: number, amount: number): Promise<boolean> => {
    const success = await addDeposit(goalId, amount);
    if (success) {
      setDepositGoalId(null);
    }
    return success;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          {t('finance.savingsGoals')}
        </h2>
        <span className="text-xs text-telegram-hint">{goals.length} {goals.length !== 1 ? t('finance.goals') : t('finance.goal')}</span>
      </div>

      {/* Empty State */}
      {goals.length === 0 && (
        <div className="bg-telegram-secondaryBg rounded-xl p-6 text-center">
          <Target size={32} className="mx-auto text-telegram-hint mb-2" />
          <p className="text-sm text-telegram-hint">{t('finance.noSavingsGoals')}</p>
          <p className="text-xs text-telegram-hint mt-1">{t('finance.createFirstGoal')}</p>
        </div>
      )}

      {/* Goal Cards */}
      {goals.map((goal, idx) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          index={idx}
          depositGoalId={depositGoalId}
          onToggleDeposit={handleToggleDeposit}
          submitting={submitting}
          onDeposit={handleDeposit}
        />
      ))}

      <GoalForm submitting={submitting} onCreateGoal={createGoal} />

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
