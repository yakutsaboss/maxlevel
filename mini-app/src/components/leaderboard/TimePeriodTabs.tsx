export type TimePeriod = 'weekly' | 'monthly' | 'all_time';

interface TimePeriodTabsProps {
  timePeriod: TimePeriod;
  onSelect: (period: TimePeriod) => void;
  haptic: { selection: () => void };
}

const TABS: { value: TimePeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'all_time', label: 'All Time' },
];

export function TimePeriodTabs({ timePeriod, onSelect, haptic }: TimePeriodTabsProps) {
  return (
    <div className="flex gap-2 bg-white/20 backdrop-blur-sm rounded-2xl p-1" role="tablist" aria-label="Leaderboard time period">
      {TABS.map(({ value, label }) => (
        <button
          key={value}
          role="tab"
          aria-selected={timePeriod === value}
          aria-label={`${label} leaderboard`}
          onClick={() => { haptic.selection(); onSelect(value); }}
          className={`flex-1 py-2 px-3 rounded-xl font-medium text-sm transition-all ${
            timePeriod === value ? 'bg-white text-orange-600 shadow-lg' : 'text-white/70'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
