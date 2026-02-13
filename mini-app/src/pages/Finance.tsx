import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '@/hooks/useTelegram';
import { DollarSign, Wallet, PiggyBank, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ErrorSection } from '@/components/ErrorSection';
import { BudgetTracker } from '@/components/finance/BudgetTracker';
import { SavingsGoal } from '@/components/finance/SavingsGoal';

type FinanceTab = 'budget' | 'savings';

export function Finance() {
  const { t } = useTranslation();
  const { user } = useTelegram();
  const [activeTab, setActiveTab] = useState<FinanceTab>('budget');

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-telegram-bg">
        <Loader2 className="w-6 h-6 animate-spin text-telegram-hint" />
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
            <DollarSign className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{t('finance.title')}</h1>
            <p className="text-emerald-100 text-sm">{t('finance.subtitle')}</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1">
          <button
            onClick={() => setActiveTab('budget')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'budget'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <Wallet className="w-4 h-4" />
            {t('finance.budget')}
          </button>
          <button
            onClick={() => setActiveTab('savings')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'savings'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-white/80'
            }`}
          >
            <PiggyBank className="w-4 h-4" />
            {t('finance.savings')}
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
          ) : (
            <SavingsGoal userId={user.id} />
          )}
        </motion.div>
      </div>
    </div>
  );
}
