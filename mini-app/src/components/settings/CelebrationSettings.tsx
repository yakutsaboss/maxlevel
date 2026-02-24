import { useTranslation } from 'react-i18next';
import { PartyPopper, Smile, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useCelebrationStyle } from '@/hooks/useCelebrationStyle.js';

type CelebrationStyle = 'emoji' | 'animated';

interface Option {
  value: CelebrationStyle;
  labelKey: string;
  descKey: string;
  preview: string;
}

const options: Option[] = [
  {
    value: 'emoji',
    labelKey: 'settings.celebrationClassic',
    descKey: 'settings.celebrationClassicDesc',
    preview: '👍 ⭐ 🏆',
  },
  {
    value: 'animated',
    labelKey: 'settings.celebrationAnimated',
    descKey: 'settings.celebrationAnimatedDesc',
    preview: '✨',
  },
];

interface CelebrationSettingsProps {
  haptic?: { selection: () => void };
}

export function CelebrationSettings({ haptic }: CelebrationSettingsProps) {
  const { t } = useTranslation();
  const { style, setStyle } = useCelebrationStyle();

  const handleSelect = (value: CelebrationStyle) => {
    if (value !== style) {
      haptic?.selection();
      setStyle(value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.18 }}
      className="bg-telegram-secondaryBg rounded-2xl p-4 border border-telegram-hint/10"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-emerald-500 w-10 h-10 rounded-xl flex items-center justify-center text-white">
          <PartyPopper className="w-5 h-5" aria-hidden="true" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">{t('settings.celebrationStyle')}</h3>
        </div>
      </div>

      {/* Option cards */}
      <div className="flex gap-2">
        {options.map(({ value, labelKey, descKey, preview }) => {
          const selected = style === value;
          const Icon = value === 'emoji' ? Smile : Sparkles;

          return (
            <button
              key={value}
              onClick={() => handleSelect(value)}
              aria-label={`${t(labelKey)}: ${t(descKey)}`}
              className={`flex-1 py-3 px-3 rounded-xl text-center transition-all active:scale-95 ${
                selected
                  ? 'bg-emerald-500/15 ring-2 ring-emerald-500 text-telegram-text'
                  : 'bg-telegram-bg text-telegram-hint border border-telegram-hint/20'
              }`}
            >
              <Icon
                className={`w-4 h-4 mx-auto mb-1.5 ${selected ? 'text-emerald-500' : ''}`}
                aria-hidden="true"
              />
              <div className="text-lg mb-1">{preview}</div>
              <div className="text-xs font-semibold">{t(labelKey)}</div>
              <div
                className={`text-[10px] mt-0.5 ${
                  selected ? 'text-emerald-500/70' : 'text-telegram-hint/70'
                }`}
              >
                {t(descKey)}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
