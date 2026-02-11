import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';

const MODES = [
  {
    id: 'fitness',
    name: 'Fitness',
    desc: 'Workouts, body goals & daily movement',
    icon: '🏋️',
    color: 'border-red-500 bg-red-500/10',
    available: true,
  },
  {
    id: 'hydration',
    name: 'Hydration',
    desc: 'Track water intake & build the habit',
    icon: '💧',
    color: 'border-blue-500 bg-blue-500/10',
    available: true,
  },
  {
    id: 'finance',
    name: 'Finance',
    desc: 'Budget tracking & saving goals',
    icon: '💰',
    color: 'border-yellow-500 bg-yellow-500/10',
    available: true,
  },
  {
    id: 'learning',
    name: 'Learning',
    desc: 'New skills & daily learning habits',
    icon: '📚',
    color: 'border-green-500 bg-green-500/10',
    available: true,
  },
];

interface PathSelectProps {
  progress: number;
  stepLabel?: string;
  value?: string[];
  onSelect: (modes: string[]) => void;
  onNext: () => void;
}

export function PathSelect({ progress, stepLabel, value, onSelect, onNext }: PathSelectProps) {
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState<string[]>(value || []);

  const toggle = (id: string) => {
    haptic.selection();
    const next = selected.includes(id)
      ? selected.filter((m) => m !== id)
      : [...selected, id];
    setSelected(next);
    onSelect(next);
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

      <div className="flex-1 flex flex-col px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-telegram-text text-center mb-2">
            What Do You Want to Improve?
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            Pick the areas you want to focus on
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {MODES.map((mode, i) => {
            const isSelected = selected.includes(mode.id);
            return (
              <motion.button
                key={mode.id}
                onClick={() => mode.available && toggle(mode.id)}
                className={`
                  relative rounded-2xl p-4 text-left transition-all border-2
                  ${
                    !mode.available
                      ? 'opacity-50 border-telegram-hint/20 bg-telegram-secondaryBg cursor-not-allowed'
                      : isSelected
                      ? `${mode.color} shadow-lg`
                      : 'border-telegram-hint/20 bg-telegram-secondaryBg'
                  }
                `}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileTap={mode.available ? { scale: 0.95 } : undefined}
              >
                {!mode.available && (
                  <div className="absolute top-2 right-2 bg-telegram-hint/30 rounded-full px-2 py-0.5 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-telegram-hint" />
                    <span className="text-[10px] text-telegram-hint font-medium">Soon</span>
                  </div>
                )}
                <span className="text-3xl block mb-2">{mode.icon}</span>
                <h3 className="font-semibold text-sm text-telegram-text mb-1">{mode.name}</h3>
                <p className="text-xs text-telegram-hint leading-snug">{mode.desc}</p>
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={onNext}
          disabled={selected.length === 0}
          className={`
            w-full py-4 rounded-2xl text-lg font-bold transition-all
            ${
              selected.length > 0
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-telegram-hint/20 text-telegram-hint'
            }
          `}
        >
          {selected.length > 0 ? `Continue (${selected.length} selected)` : 'Select at least 1'}
        </button>
      </div>
    </div>
  );
}
