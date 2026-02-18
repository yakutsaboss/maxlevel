import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategorySlice } from '@/hooks/useFinanceAnalytics';

interface CategoryBreakdownProps {
  categoryData: CategorySlice[];
}

export function CategoryBreakdown({ categoryData }: CategoryBreakdownProps) {
  const { t } = useTranslation();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (categoryData.length === 0) {
    return (
      <div className="bg-telegram-secondaryBg rounded-xl p-4 text-center">
        <p className="text-sm text-telegram-hint">{t('finance.charts.noCategoryData')}</p>
      </div>
    );
  }

  const total = categoryData.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="bg-telegram-secondaryBg rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center gap-2">
        <PieChartIcon size={14} className="text-telegram-hint" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-telegram-hint uppercase tracking-wide">
          {t('finance.charts.categoryBreakdown')}
        </h3>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              onClick={(_, index) => setActiveIndex(index)}
              stroke="none"
            >
              {categoryData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{ transition: 'opacity 0.2s' }}
                />
              ))}
            </Pie>
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
            {/* Center label */}
            <text
              x="50%"
              y="48%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--tg-theme-text-color, #fff)"
              fontSize={16}
              fontWeight="bold"
            >
              {activeIndex !== null
                ? categoryData[activeIndex].value.toLocaleString()
                : total.toLocaleString()}
            </text>
            <text
              x="50%"
              y="58%"
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--tg-theme-hint-color, #8b8b8b)"
              fontSize={10}
            >
              {activeIndex !== null
                ? categoryData[activeIndex].name
                : t('finance.charts.spent')}
            </text>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {categoryData.map((entry, idx) => {
          const pct = total > 0 ? ((entry.value / total) * 100).toFixed(0) : '0';
          return (
            <motion.button
              key={entry.name}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.03 }}
              onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              className={`flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-colors ${
                activeIndex === idx ? 'bg-telegram-bg' : ''
              }`}
            >
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-telegram-text truncate flex-1">{entry.name}</span>
              <span className="text-[10px] text-telegram-hint">{pct}%</span>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
