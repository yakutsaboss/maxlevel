import { motion } from 'framer-motion';
import { Target, Calendar, TrendingUp, Wallet } from 'lucide-react';
import { type SavingsGoalData, getProjectedCompletion } from '@/components/finance/useSavingsGoals';
import { GoalContribution } from '@/components/finance/GoalContribution';

interface GoalCardProps {
  goal: SavingsGoalData;
  index: number;
  depositGoalId: number | null;
  onToggleDeposit: (goalId: number) => void;
  submitting: boolean;
  onDeposit: (goalId: number, amount: number) => Promise<boolean>;
}

export function GoalCard({
  goal,
  index,
  depositGoalId,
  onToggleDeposit,
  submitting,
  onDeposit,
}: GoalCardProps) {
  const progress = goal.target_amount > 0
    ? Math.min((goal.current_amount / goal.target_amount) * 100, 100)
    : 0;
  const isComplete = goal.current_amount >= goal.target_amount;

  return (
    <motion.div
      key={goal.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
            onClick={() => onToggleDeposit(goal.id)}
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
      <GoalContribution
        goalId={goal.id}
        isOpen={depositGoalId === goal.id}
        submitting={submitting}
        onDeposit={onDeposit}
      />
    </motion.div>
  );
}
