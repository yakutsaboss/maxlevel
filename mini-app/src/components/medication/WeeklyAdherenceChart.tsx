import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { DailyAdherence } from '@/hooks/useMedicationAnalytics';

interface WeeklyAdherenceChartProps {
  data: DailyAdherence[];
}

function getBarColor(rate: number): string {
  if (rate >= 80) return '#22c55e'; // green-500
  if (rate >= 50) return '#eab308'; // yellow-500
  return '#ef4444'; // red-500
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short' });
}

export function WeeklyAdherenceChart({ data }: WeeklyAdherenceChartProps) {
  const { t } = useTranslation();

  const chartData = useMemo(() => {
    const last7 = data.slice(-7);
    return last7.map(d => ({
      day: getDayLabel(d.date),
      rate: Math.round(d.rate),
      taken: d.taken,
      total: d.total,
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
        <h3 className="text-sm font-semibold text-telegram-text mb-3">
          {t('medication.weeklyAdherence', 'Weekly Adherence')}
        </h3>
        <div className="flex items-center justify-center h-[160px]">
          <p className="text-sm text-telegram-hint">
            {t('medication.noDataYet', 'Start tracking to see your weekly chart')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      <h3 className="text-sm font-semibold text-telegram-text mb-3">
        {t('medication.weeklyAdherence', 'Weekly Adherence')}
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: 'var(--tg-theme-hint-color)' }}
            axisLine={false}
            tickLine={false}
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
          <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={32}>
            {chartData.map((entry, index) => (
              <Cell key={index} fill={getBarColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
