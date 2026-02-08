import { DrumRoller } from './DrumRoller';

interface DualTimePickerProps {
  wakeTime: number;
  sleepTime: number;
  onWakeChange: (hour: number) => void;
  onSleepChange: (hour: number) => void;
}

export function DualTimePicker({
  wakeTime,
  sleepTime,
  onWakeChange,
  onSleepChange,
}: DualTimePickerProps) {
  const formatHour = (h: number) => `${String(h).padStart(2, '0')}:00`;

  return (
    <div className="flex gap-6 items-start justify-center">
      <div className="flex-1">
        <p className="text-center text-sm text-telegram-hint mb-2 font-medium">Wake up</p>
        <DrumRoller
          min={5}
          max={12}
          value={wakeTime}
          onChange={onWakeChange}
          formatLabel={formatHour}
        />
      </div>
      <div className="flex-1">
        <p className="text-center text-sm text-telegram-hint mb-2 font-medium">Sleep</p>
        <DrumRoller
          min={20}
          max={26}
          value={sleepTime}
          onChange={onSleepChange}
          formatLabel={(h) => formatHour(h > 23 ? h - 24 : h)}
        />
      </div>
    </div>
  );
}
