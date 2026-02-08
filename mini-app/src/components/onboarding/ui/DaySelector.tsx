import { useTelegram } from '@/hooks/useTelegram';

const DAYS = [
  { value: 'mon', label: 'M' },
  { value: 'tue', label: 'T' },
  { value: 'wed', label: 'W' },
  { value: 'thu', label: 'T' },
  { value: 'fri', label: 'F' },
  { value: 'sat', label: 'S' },
  { value: 'sun', label: 'S' },
];

interface DaySelectorProps {
  selected: string[];
  onChange: (days: string[]) => void;
  requiredCount?: number;
}

export function DaySelector({ selected, onChange, requiredCount }: DaySelectorProps) {
  const { haptic } = useTelegram();

  const toggleDay = (day: string) => {
    haptic.selection();
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  };

  const isValid = !requiredCount || selected.length === requiredCount;

  return (
    <div>
      <div className="flex justify-center gap-2">
        {DAYS.map((day) => {
          const isSelected = selected.includes(day.value);
          return (
            <button
              key={day.value}
              onClick={() => toggleDay(day.value)}
              className={`
                w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-telegram-link text-white shadow-lg shadow-telegram-link/30'
                    : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/20'
                }
              `}
            >
              {day.label}
            </button>
          );
        })}
      </div>
      {requiredCount && !isValid && selected.length > 0 && (
        <p className="text-center text-xs text-orange-400 mt-3">
          Select exactly {requiredCount} days ({selected.length}/{requiredCount})
        </p>
      )}
    </div>
  );
}
