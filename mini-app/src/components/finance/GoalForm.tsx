import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';

interface GoalFormProps {
  submitting: boolean;
  onCreateGoal: (name: string, targetAmount: number) => Promise<boolean>;
}

export function GoalForm({ submitting, onCreateGoal }: GoalFormProps) {
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(targetAmount);
    if (!goalName.trim() || !parsed || parsed <= 0) return;

    const success = await onCreateGoal(goalName.trim(), parsed);
    if (success) {
      setGoalName('');
      setTargetAmount('');
      setShowNewGoal(false);
    }
  };

  return (
    <>
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
    </>
  );
}
