import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown, PieChart } from 'lucide-react';
import { CATEGORY_COLORS } from '@/components/finance/useBudget';

interface BudgetSummaryProps {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  spentPercent: number;
  byCategory: Record<string, number>;
}

export function BudgetSummary({
  totalIncome,
  totalExpense,
  balance,
  spentPercent,
  byCategory,
}: BudgetSummaryProps) {
  const { t } = useTranslation();

  return (
    <>
      {/* Monthly Summary */}
      <div className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          {t('finance.budgetSummary')}
        </h2>

        <div className="grid grid-cols-3 gap-3">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-emerald-500/10 flex items-center justify-center mb-1">
              <TrendingUp size={16} className="text-emerald-500" aria-hidden="true" />
            </div>
            <div className="text-lg font-bold text-telegram-text">{totalIncome.toLocaleString()}</div>
            <div className="text-[10px] text-telegram-hint">{t('finance.income')}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-red-500/10 flex items-center justify-center mb-1">
              <TrendingDown size={16} className="text-red-500" aria-hidden="true" />
            </div>
            <div className="text-lg font-bold text-telegram-text">{totalExpense.toLocaleString()}</div>
            <div className="text-[10px] text-telegram-hint">{t('finance.expenses')}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <div className="w-8 h-8 mx-auto rounded-lg bg-telegram-button/10 flex items-center justify-center mb-1">
              <DollarSign size={16} className="text-telegram-button" aria-hidden="true" />
            </div>
            <div className={`text-lg font-bold ${balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {balance.toLocaleString()}
            </div>
            <div className="text-[10px] text-telegram-hint">{t('finance.balance')}</div>
          </motion.div>
        </div>

        {/* Spending progress bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-telegram-hint">
            <span>{t('finance.spent')}</span>
            <span>{spentPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-telegram-bg rounded-full overflow-hidden" role="progressbar" aria-valuenow={spentPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`Budget spent: ${spentPercent.toFixed(0)}%`}>
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
            <PieChart size={14} className="text-telegram-hint" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
              {t('finance.categoryBreakdown')}
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
    </>
  );
}
