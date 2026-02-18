import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram';
import { useBudget } from '@/components/finance/useBudget';
import { useFinanceAnalytics } from '@/hooks/useFinanceAnalytics';
import { DollarSign, Wallet, PiggyBank, BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { BudgetTracker } from '@/components/finance/BudgetTracker';
import { SavingsGoal } from '@/components/finance/SavingsGoal';
import { SpendingChart } from '@/components/finance/SpendingChart';
import { CategoryBreakdown } from '@/components/finance/CategoryBreakdown';

type FinanceTab = 'budget' | 'savings' | 'analytics';

function AnalyticsTab({ userId }: { userId: number }) {
  const { entries, loading } = useBudget(userId);
  const { dailySpending, categoryData, monthlyComparison, hasExpenses } = useFinanceAnalytics(entries);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12" role="status" aria-label="Loading analytics">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryBreakdown categoryData={categoryData} />
      <SpendingChart
        dailySpending={dailySpending}
        monthlyComparison={monthlyComparison}
        hasExpenses={hasExpenses}
      />
    </div>
  );
}

export function Finance() {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const [activeTab, setActiveTab] = useState<FinanceTab>('budget');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg" role="status" aria-label="Loading finance">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" aria-hidden="true" />
      </div>
    );
  }

  if (!user.id) {
    return <ErrorSection message={t('finance.couldNotIdentify')} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="min-h-screen bg-telegram-bg text-telegram-text pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 pt-8 pb-6 px-6 rounded-b-3xl shadow-lg safe-area-top">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-3">
            <DollarSign className="w-8 h-8 text-white" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('finance.title')}</h1>
            <p className="text-emerald-100 text-sm">{t('finance.subtitle')}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-white/20 backdrop-blur-sm rounded-2xl p-1" role="tablist" aria-label="Finance tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'budget'}
            onClick={() => setActiveTab('budget')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'budget'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <Wallet className="w-4 h-4" aria-hidden="true" />
            {t('finance.budget')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'savings'}
            onClick={() => setActiveTab('savings')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'savings'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <PiggyBank className="w-4 h-4" aria-hidden="true" />
            {t('finance.savings')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'analytics'}
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
            {t('finance.charts.tab')}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 mt-6">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'budget' ? (
            <BudgetTracker userId={user.id} />
          ) : activeTab === 'savings' ? (
            <SavingsGoal userId={user.id} />
          ) : (
            <AnalyticsTab userId={user.id} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
