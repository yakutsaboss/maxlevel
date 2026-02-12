import { memo, useState } from 'react';
import { motion } from 'framer-motion';

const FREQUENCY_OPTIONS = [
  { value: 'daily' as const, label: 'Every day' },
  { value: 'weekdays' as const, label: 'Weekdays only' },
  { value: 'custom' as const, label: 'Custom' },
];

const EMOJI_GRID = ['🏃', '📚', '💪', '🧘', '💧', '🎯', '✍️', '🎨', '🎵', '💤', '🥗', '🧠'];

export interface Habit {
  name: string;
  frequency: 'daily' | 'weekdays' | 'custom';
  reminderTime: string;
  icon: string;
}

interface HabitBuilderProps {
  onSave: (habit: Habit) => void;
  initialHabit?: Partial<Habit>;
}

export const HabitBuilder = memo(function HabitBuilder({ onSave, initialHabit }: HabitBuilderProps) {
  const [habitName, setHabitName] = useState(initialHabit?.name ?? '');
  const [frequency, setFrequency] = useState<Habit['frequency']>(initialHabit?.frequency ?? 'daily');
  const [reminderTime, setReminderTime] = useState(initialHabit?.reminderTime ?? '09:00');
  const [icon, setIcon] = useState(initialHabit?.icon ?? '🎯');

  const canSubmit = habitName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ name: habitName.trim(), frequency, reminderTime, icon });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Habit name */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/20">
        <label className="text-sm text-telegram-hint mb-2 block">Habit name</label>
        <input
          type="text"
          value={habitName}
          onChange={(e) => setHabitName(e.target.value)}
          placeholder="e.g. Morning run"
          maxLength={50}
          className="w-full bg-transparent text-lg font-medium outline-none placeholder:text-telegram-hint/50"
        />
      </div>

      {/* Icon picker */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/20">
        <label className="text-sm text-telegram-hint mb-3 block">Icon</label>
        <div className="grid grid-cols-6 gap-2">
          {EMOJI_GRID.map((emoji) => (
            <motion.button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              whileTap={{ scale: 0.9 }}
              className={`text-2xl p-2 rounded-xl transition-colors ${
                icon === emoji
                  ? 'bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-400/40'
                  : 'hover:bg-telegram-hint/10'
              }`}
            >
              {emoji}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Frequency */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/20">
        <label className="text-sm text-telegram-hint mb-3 block">Frequency</label>
        <div className="flex gap-2">
          {FREQUENCY_OPTIONS.map((opt) => (
            <motion.button
              key={opt.value}
              type="button"
              onClick={() => setFrequency(opt.value)}
              whileTap={{ scale: 0.95 }}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${
                frequency === opt.value
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                  : 'bg-telegram-hint/10 text-telegram-hint'
              }`}
            >
              {opt.label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Reminder time */}
      <div className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/20">
        <label className="text-sm text-telegram-hint mb-2 block">Reminder time</label>
        <input
          type="time"
          value={reminderTime}
          onChange={(e) => setReminderTime(e.target.value)}
          className="w-full bg-transparent text-lg font-medium outline-none"
        />
      </div>

      {/* Submit */}
      <motion.button
        type="submit"
        disabled={!canSubmit}
        whileTap={canSubmit ? { scale: 0.97 } : {}}
        className={`w-full py-4 rounded-2xl text-lg font-bold transition-opacity ${
          canSubmit
            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
            : 'bg-telegram-hint/20 text-telegram-hint/50 cursor-not-allowed'
        }`}
      >
        {initialHabit ? 'Save Changes' : 'Create Habit'}
      </motion.button>
    </form>
  );
});
