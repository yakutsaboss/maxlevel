import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useTelegram } from '@/hooks/useTelegram';
import type { Medication, MedicationFrequency, AddMedicationData } from '@/types';

interface MedicationFormProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<AddMedicationData, 'telegram_id'>) => void;
  editingMedication?: Medication | null;
}

const PRESET_COLORS = [
  { name: 'blue', class: 'bg-blue-500' },
  { name: 'red', class: 'bg-red-500' },
  { name: 'green', class: 'bg-green-500' },
  { name: 'purple', class: 'bg-purple-500' },
  { name: 'orange', class: 'bg-orange-500' },
  { name: 'pink', class: 'bg-pink-500' },
];

const FREQUENCIES: Array<{ value: MedicationFrequency; timeCount: number }> = [
  { value: 'daily', timeCount: 1 },
  { value: 'twice_daily', timeCount: 2 },
  { value: 'three_times', timeCount: 3 },
  { value: 'weekly', timeCount: 1 },
  { value: 'as_needed', timeCount: 0 },
];

const FREQUENCY_KEYS: Record<string, string> = {
  daily: 'medication.frequencyDaily',
  twice_daily: 'medication.frequencyTwice',
  three_times: 'medication.frequencyThree',
  weekly: 'medication.frequencyWeekly',
  as_needed: 'medication.frequencyAsNeeded',
};

function getDefaultTimes(frequency: string): string[] {
  switch (frequency) {
    case 'twice_daily': return ['08:00', '20:00'];
    case 'three_times': return ['08:00', '14:00', '20:00'];
    case 'as_needed': return [];
    default: return ['08:00'];
  }
}

export function MedicationForm({ open, onClose, onSave, editingMedication }: MedicationFormProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();

  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState<MedicationFrequency>('daily');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [color, setColor] = useState('blue');
  const [notes, setNotes] = useState('');

  // Populate form when editing
  useEffect(() => {
    if (editingMedication) {
      setName(editingMedication.name);
      setDosage(editingMedication.dosage || '');
      setFrequency(editingMedication.frequency);
      setTimes(editingMedication.time_of_day);
      setColor(editingMedication.color);
      setNotes(editingMedication.notes || '');
    } else {
      setName('');
      setDosage('');
      setFrequency('daily');
      setTimes(['08:00']);
      setColor('blue');
      setNotes('');
    }
  }, [editingMedication, open]);

  const handleFrequencyChange = (newFreq: MedicationFrequency) => {
    setFrequency(newFreq);
    setTimes(getDefaultTimes(newFreq));
    haptic.impact('light');
  };

  const handleTimeChange = (index: number, value: string) => {
    setTimes(prev => prev.map((t, i) => i === index ? value : t));
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    haptic.impact('medium');
    onSave({
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      frequency,
      time_of_day: times,
      color: color || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const freqConfig = FREQUENCIES.find(f => f.value === frequency);
  const timeCount = freqConfig?.timeCount ?? 1;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Slide-up modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-telegram-bg rounded-t-3xl max-h-[85vh] overflow-y-auto safe-area-bottom"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-telegram-hint/30 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 className="text-lg font-bold text-telegram-text">
                {editingMedication ? t('medication.editMedication') : t('medication.addMedication')}
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-telegram-hint/10 active:scale-90 transition-transform"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-telegram-hint" />
              </button>
            </div>

            <div className="px-4 pb-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1.5">
                  {t('medication.name')} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('medication.name')}
                  className="w-full px-4 py-3 rounded-xl bg-telegram-secondaryBg text-telegram-text border border-telegram-hint/10 focus:border-telegram-link focus:outline-none transition-colors"
                  maxLength={100}
                  autoFocus
                />
              </div>

              {/* Dosage */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1.5">
                  {t('medication.dosage')}
                </label>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="e.g., 500mg, 2 tablets"
                  className="w-full px-4 py-3 rounded-xl bg-telegram-secondaryBg text-telegram-text border border-telegram-hint/10 focus:border-telegram-link focus:outline-none transition-colors"
                  maxLength={100}
                />
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1.5">
                  {t('medication.frequency')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {FREQUENCIES.map(f => (
                    <button
                      key={f.value}
                      onClick={() => handleFrequencyChange(f.value)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                        frequency === f.value
                          ? 'bg-telegram-link text-white'
                          : 'bg-telegram-secondaryBg text-telegram-hint border border-telegram-hint/10'
                      }`}
                    >
                      {t(FREQUENCY_KEYS[f.value])}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time pickers */}
              {timeCount > 0 && (
                <div>
                  <label className="block text-sm font-medium text-telegram-text mb-1.5">
                    {t('medication.timeOfDay')}
                  </label>
                  <div className="space-y-2">
                    {times.slice(0, timeCount).map((time, index) => (
                      <input
                        key={index}
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-telegram-secondaryBg text-telegram-text border border-telegram-hint/10 focus:border-telegram-link focus:outline-none transition-colors"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color picker */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1.5">
                  {t('medication.color')}
                </label>
                <div className="flex gap-3">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c.name}
                      onClick={() => { setColor(c.name); haptic.impact('light'); }}
                      className={`w-10 h-10 rounded-full ${c.class} transition-transform ${
                        color === c.name ? 'ring-2 ring-offset-2 ring-telegram-link scale-110' : ''
                      }`}
                      aria-label={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-telegram-text mb-1.5">
                  {t('medication.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('medication.notes')}
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl bg-telegram-secondaryBg text-telegram-text border border-telegram-hint/10 focus:border-telegram-link focus:outline-none transition-colors resize-none"
                  maxLength={500}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl bg-telegram-secondaryBg text-telegram-hint font-medium active:scale-95 transition-transform"
                >
                  {t('medication.cancel')}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim()}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium active:scale-95 transition-transform disabled:opacity-50 disabled:active:scale-100"
                >
                  {t('medication.save')}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
