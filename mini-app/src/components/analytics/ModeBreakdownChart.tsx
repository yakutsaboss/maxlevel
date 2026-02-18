import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { PieChart } from 'lucide-react';
import type { ModeBreakdownItem } from '@/hooks/useAnalytics';

interface ModeBreakdownChartProps {
  modes: ModeBreakdownItem[];
}

const MODE_COLORS = [
  '#3390ec', // blue
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
];

export function ModeBreakdownChart({ modes }: ModeBreakdownChartProps) {
  const { t } = useTranslation();

  if (modes.length === 0) {
    return (
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
        <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-telegram-link" />
          {t('analyticsPage.modeBreakdown')}
        </h3>
        <p className="text-sm text-telegram-hint text-center py-6">
          {t('analytics.noActiveModes')}
        </p>
      </div>
    );
  }

  const chartData = modes.map((m) => ({
    name: m.icon + ' ' + m.display_name,
    completion: m.completion_rate,
    xp: m.xp_earned,
    displayName: m.display_name,
  }));

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
        <PieChart className="w-4 h-4 text-telegram-link" />
        {t('analyticsPage.modeBreakdown')}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tg-theme-hint-color, #999)" opacity={0.15} horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--tg-theme-hint-color, #999)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: 'var(--tg-theme-text-color, #fff)' }}
              axisLine={false}
              tickLine={false}
              width={100}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color, #1e1e1e)',
                border: '1px solid var(--tg-theme-hint-color, #666)',
                borderRadius: '12px',
                color: 'var(--tg-theme-text-color, #fff)',
                fontSize: 12,
              }}
              formatter={(value: any, _name: any, props: any) => [
                `${value}% (${props.payload.xp} XP)`,
                t('analytics.completion'),
              ]}
            />
            <Bar dataKey="completion" radius={[0, 6, 6, 0]} barSize={20}>
              {chartData.map((_entry, index) => (
                <Cell key={index} fill={MODE_COLORS[index % MODE_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
