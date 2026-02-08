import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';

const AVATARS = [
  { value: 'male', label: 'Warrior', icon: '🗡️' },
  { value: 'female', label: 'Sorceress', icon: '🔮' },
  { value: 'other', label: 'Shapeshifter', icon: '🌀' },
];

interface AvatarSelectProps {
  progress: number;
  value?: string;
  onSelect: (gender: string) => void;
  onNext: () => void;
}

export function AvatarSelect({ progress, value, onSelect, onNext }: AvatarSelectProps) {
  const { haptic } = useTelegram();
  const [selected, setSelected] = useState(value || '');

  const handleSelect = (v: string) => {
    haptic.selection();
    setSelected(v);
    onSelect(v);
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} />

      <div className="flex-1 flex flex-col px-6 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-2xl font-bold text-telegram-text text-center mb-2">
            Choose Your Avatar
          </h2>
          <p className="text-telegram-hint text-center mb-8">
            What form does your hero take?
          </p>
        </motion.div>

        <div className="space-y-3">
          {AVATARS.map((avatar, i) => (
            <motion.button
              key={avatar.value}
              onClick={() => handleSelect(avatar.value)}
              className={`
                w-full py-4 px-5 rounded-2xl flex items-center gap-4 transition-all
                ${
                  selected === avatar.value
                    ? 'bg-telegram-link/15 border-2 border-telegram-link shadow-lg shadow-telegram-link/10'
                    : 'bg-telegram-secondaryBg border-2 border-transparent'
                }
              `}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-3xl">{avatar.icon}</span>
              <span className={`text-lg font-semibold ${
                selected === avatar.value ? 'text-telegram-link' : 'text-telegram-text'
              }`}>
                {avatar.label}
              </span>
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
