import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';

const AVATARS = [
  { value: 'gym_warrior', label: 'Gym Warrior', icon: '💪', desc: 'Lives for the grind' },
  { value: 'office_boss', label: 'Office Boss', icon: '👑', desc: 'Crushing goals 9 to 5' },
  { value: 'magic_pet', label: 'Magic Pet', icon: '🐱', desc: 'Cute but deadly serious' },
  { value: 'night_owl', label: 'Night Owl', icon: '🦉', desc: 'Peak performance after midnight' },
  { value: 'couch_hero', label: 'Couch Hero', icon: '🥔', desc: 'Starting from zero, going to hero' },
];

interface AvatarSelectProps {
  progress: number;
  stepLabel?: string;
  value?: string;
  onSelect: (avatar: string) => void;
  onNext: () => void;
}

export function AvatarSelect({ progress, stepLabel, value, onSelect, onNext }: AvatarSelectProps) {
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState(value || '');

  const handleSelect = (v: string) => {
    haptic.selection();
    setSelected(v);
    onSelect(v);
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
            Pick Your Character
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            Which one sounds like you?
          </p>
        </motion.div>

        <div className="space-y-2.5">
          {AVATARS.map((avatar, i) => (
            <motion.button
              key={avatar.value}
              onClick={() => handleSelect(avatar.value)}
              className={`
                w-full py-3.5 px-4 rounded-2xl flex items-center gap-3.5 transition-all
                ${
                  selected === avatar.value
                    ? 'bg-telegram-link/15 border-2 border-telegram-link shadow-lg shadow-telegram-link/10'
                    : 'bg-telegram-secondaryBg border-2 border-transparent'
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl">{avatar.icon}</span>
              <div className="text-left">
                <span className={`text-base font-semibold block ${
                  selected === avatar.value ? 'text-telegram-link' : 'text-telegram-text'
                }`}>
                  {avatar.label}
                </span>
                <span className="text-xs text-telegram-hint">{avatar.desc}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={onNext}
          disabled={!selected}
          className={`
            w-full py-4 rounded-2xl text-lg font-bold transition-all
            ${
              selected
                ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                : 'bg-telegram-hint/20 text-telegram-hint'
            }
          `}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
