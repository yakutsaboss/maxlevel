import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock, Pencil, Trash2 } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import type { Medication } from '@/types';

interface MedicationCardProps {
  medication: Medication;
  index: number;
  onEdit: (medication: Medication) => void;
  onDelete: (id: number) => void;
}

const COLOR_MAP: Record<string, { bg: string; dot: string; chip: string }> = {
  blue:   { bg: 'bg-blue-50',   dot: 'bg-blue-500',   chip: 'bg-blue-100 text-blue-700' },
  red:    { bg: 'bg-red-50',    dot: 'bg-red-500',    chip: 'bg-red-100 text-red-700' },
  green:  { bg: 'bg-green-50',  dot: 'bg-green-500',  chip: 'bg-green-100 text-green-700' },
  purple: { bg: 'bg-purple-50', dot: 'bg-purple-500', chip: 'bg-purple-100 text-purple-700' },
  orange: { bg: 'bg-orange-50', dot: 'bg-orange-500', chip: 'bg-orange-100 text-orange-700' },
  pink:   { bg: 'bg-pink-50',   dot: 'bg-pink-500',   chip: 'bg-pink-100 text-pink-700' },
};

const FREQUENCY_KEYS: Record<string, string> = {
  daily: 'medication.frequencyDaily',
  twice_daily: 'medication.frequencyTwice',
  three_times: 'medication.frequencyThree',
  weekly: 'medication.frequencyWeekly',
  as_needed: 'medication.frequencyAsNeeded',
};

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

export function MedicationCard({ medication, index, onEdit, onDelete }: MedicationCardProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const [showActions, setShowActions] = useState(false);

  const colors = COLOR_MAP[medication.color] || COLOR_MAP.blue;

  const handleLongPress = () => {
    haptic.impact('medium');
    setShowActions(prev => !prev);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
      className={`relative rounded-2xl p-4 border border-telegram-hint/10 ${colors.bg} dark:bg-telegram-secondaryBg`}
      onContextMenu={(e) => { e.preventDefault(); handleLongPress(); }}
    >
      <div className="flex items-start gap-3">
        {/* Color dot */}
        <div className={`w-4 h-4 rounded-full mt-0.5 flex-shrink-0 ${colors.dot}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold text-telegram-text truncate">{medication.name}</h3>
            <button
              onClick={() => { haptic.impact('light'); setShowActions(prev => !prev); }}
              className="p-1 rounded-lg hover:bg-telegram-hint/10 active:scale-90 transition-transform flex-shrink-0"
              aria-label="Toggle actions"
            >
              <svg className="w-4 h-4 text-telegram-hint" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
          </div>

          {medication.dosage && (
            <p className="text-sm text-telegram-hint mt-0.5">{medication.dosage}</p>
          )}

          {/* Frequency label */}
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="w-3.5 h-3.5 text-telegram-hint" aria-hidden="true" />
            <span className="text-xs text-telegram-hint">{t(FREQUENCY_KEYS[medication.frequency] || 'medication.frequencyDaily')}</span>
          </div>

          {/* Time chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {medication.time_of_day.map(time => (
              <span key={time} className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.chip}`}>
                {formatTime(time)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex items-center gap-2 mt-3 pt-3 border-t border-telegram-hint/10"
        >
          <button
            onClick={() => { haptic.impact('light'); setShowActions(false); onEdit(medication); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-telegram-link/10 text-telegram-link text-sm font-medium active:scale-95 transition-transform"
          >
            <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
            {t('medication.editMedication')}
          </button>
          <button
            onClick={() => { haptic.impact('medium'); setShowActions(false); onDelete(medication.id); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium active:scale-95 transition-transform"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            {t('medication.delete')}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}
