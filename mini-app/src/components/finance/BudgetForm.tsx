import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusCircle } from 'lucide-react';
import { EXPENSE_CATEGORIES } from '@/components/finance/useBudget';

interface BudgetFormProps {
  submitting: boolean;
  onSubmit: (type: 'income' | 'expense', category: string, amount: number) => Promise<boolean>;
}

export function BudgetForm({ submitting, onSubmit }: BudgetFormProps) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    const success = await onSubmit(formType, category, parsedAmount);
    if (success) {
      setAmount('');
      setShowForm(false);
    }
  };

  return (
    <>
      {/* Add Entry Button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowForm((v) => !v)}
        className="w-full flex items-center justify-center gap-2 py-3 bg-telegram-button text-telegram-buttonText rounded-xl font-medium text-sm"
      >
        <PlusCircle size={16} />
        {showForm ? t('common.cancel') : t('finance.addEntry')}
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
                {t('finance.expense')}
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
                {t('finance.income')}
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
              placeholder={t('finance.amount')}
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
              {submitting ? t('finance.saving') : formType === 'income' ? t('finance.addIncome') : t('finance.addExpense')}
            </motion.button>
          </motion.form>
        )}
      </AnimatePresence>
    </>
  );
}
