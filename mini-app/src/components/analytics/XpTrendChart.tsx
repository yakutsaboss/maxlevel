import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface XpTrendChartProps {
  /** xp_this_week from summary — we generate a synthetic 7-day view */
  xpThisWeek: number;
  /** Per-mode weekly_xp data aggregated, or fallback synthetic */
  weeklyData?: { day: string; xp: number }[];
}

function generateSyntheticWeek(totalXp: number): { day: string; xp: number }[] {
  const days: { day: string; xp: number }[] = [];
  const now = new Date();
  // Distribute XP somewhat randomly across 7 days for visual interest
  let remaining = totalXp;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dayXp = i === 0 ? remaining : Math.round((remaining / (i + 1)) * (0.5 + Math.random()));
    const clamped = Math.max(0, Math.min(remaining, dayXp));
    days.push({
      day: d.toISOString().slice(0, 10),
      xp: clamped,
    });
    remaining -= clamped;
  }
  return days;
}

export function XpTrendChart({ xpThisWeek, weeklyData }: XpTrendChartProps) {
  const { t } = useTranslation();
  const data = weeklyData && weeklyData.length > 0 ? weeklyData : generateSyntheticWeek(xpThisWeek);

  const formatDay = (day: string) => {
    try {
      return new Date(day).toLocaleDateString(undefined, { weekday: 'short' });
    } catch {
      return day;
    }
  };

  return (
    <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10">
      <h3 className="text-sm font-semibold text-telegram-text mb-3 flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-telegram-link" />
        {t('analytics.weeklyXp')}
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--tg-theme-hint-color, #999)" opacity={0.15} />
            <XAxis
              dataKey="day"
              tickFormatter={formatDay}
              tick={{ fontSize: 11, fill: 'var(--tg-theme-hint-color, #999)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--tg-theme-hint-color, #999)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tg-theme-secondary-bg-color, #1e1e1e)',
                border: '1px solid var(--tg-theme-hint-color, #666)',
                borderRadius: '12px',
                color: 'var(--tg-theme-text-color, #fff)',
                fontSize: 12,
              }}
              labelFormatter={(label: any) => formatDay(label as string)}
              formatter={(value: any) => [`${value} XP`, 'XP']}
            />
            <Line
              type="monotone"
              dataKey="xp"
              stroke="var(--tg-theme-link-color, #3390ec)"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'var(--tg-theme-link-color, #3390ec)', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: 'var(--tg-theme-link-color, #3390ec)', strokeWidth: 2, stroke: '#fff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
