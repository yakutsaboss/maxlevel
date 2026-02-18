import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingDown, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import type { DailySpending, MonthlyComparison } from '@/hooks/useFinanceAnalytics';

interface SpendingChartProps {
  dailySpending: DailySpending[];
  monthlyComparison: MonthlyComparison[];
  hasExpenses: boolean;
}

export function SpendingChart({ dailySpending, monthlyComparison, hasExpenses }: SpendingChartProps) {
  const { t } = useTranslation();

  if (!hasExpenses) {
    return (
      <div className="bg-telegram-secondaryBg rounded-xl p-4 text-center">
        <p className="text-sm text-telegram-hint">{t('finance.charts.noSpendingData')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Spending Trend Line Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <TrendingDown size={14} className="text-telegram-hint" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('finance.charts.spendingTrend')}
          </h3>
        </div>

        <div className="h-48 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={dailySpending}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#8b8b8b' }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8b8b8b' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color, #1e1e1e)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--tg-theme-text-color, #fff)',
                }}
                formatter={(value: any) => [(value as number).toLocaleString(), t('finance.charts.spent')]}
              />
              <Line
                type="monotone"
                dataKey="amount"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Monthly Comparison Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={14} className="text-telegram-hint" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
            {t('finance.charts.monthlyComparison')}
          </h3>
        </div>

        <div className="h-48 -ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyComparison} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.15)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#8b8b8b' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8b8b8b' }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tg-theme-secondary-bg-color, #1e1e1e)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: 'var(--tg-theme-text-color, #fff)',
                }}
                formatter={(value: any) => (value as number).toLocaleString()}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px' }}
                formatter={(value: string) =>
                  value === 'income' ? t('finance.income') : t('finance.expenses')
                }
              />
              <Bar dataKey="income" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
