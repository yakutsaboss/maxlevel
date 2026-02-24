import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import type { DailyAdherence } from '@/hooks/useMedicationAnalytics';

interface MonthlyTrendChartProps {
  data: DailyAdherence[];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    return data.map(d => ({
      date: formatDateLabel(d.date),
      rate: Math.round(d.rate),
      taken: d.taken,
      total: d.total,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
        <h3 className="text-sm font-semibold text-telegram-text mb-3">
          {t('medication.monthlyTrend', 'Monthly Trend')}
        </h3>
        <div className="flex items-center justify-center h-[160px]">
          <p className="text-sm text-telegram-hint">
            {t('medication.noDataYet', 'Start tracking to see your monthly trend')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      <h3 className="text-sm font-semibold text-telegram-text mb-3">
        {t('medication.monthlyTrend', 'Monthly Trend')}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <defs>
            <linearGradient id="adherenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--tg-theme-hint-color)' }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: 'var(--tg-theme-hint-color)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--tg-theme-bg-color)',
              border: '1px solid var(--tg-theme-hint-color)',
              borderRadius: '12px',
              fontSize: '12px',
              color: 'var(--tg-theme-text-color)',
            }}
            formatter={(value: number | undefined) => [`${value ?? 0}%`, t('medication.adherence', 'Adherence')]}
          />
          <ReferenceLine
            y={80}
            stroke="var(--tg-theme-hint-color)"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="rate"
            stroke="#10b981"
            strokeWidth={2}
            fill="url(#adherenceGradient)"
            dot={false}
            activeDot={{ r: 4, fill: '#10b981', stroke: 'var(--tg-theme-bg-color)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
