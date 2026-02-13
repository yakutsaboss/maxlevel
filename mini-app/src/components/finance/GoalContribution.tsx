import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GoalContributionProps {
  goalId: number;
  isOpen: boolean;
  submitting: boolean;
  onDeposit: (goalId: number, amount: number) => Promise<boolean>;
}

export function GoalContribution({ goalId, isOpen, submitting, onDeposit }: GoalContributionProps) {
  const [depositAmount, setDepositAmount] = useState('');

  const handleDeposit = async () => {
    const parsed = parseFloat(depositAmount);
    if (!parsed || parsed <= 0) return;

    const success = await onDeposit(goalId, parsed);
    if (success) {
      setDepositAmount('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
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
            onClick={handleDeposit}
            disabled={submitting || !depositAmount}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {submitting ? '...' : 'Add'}
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
