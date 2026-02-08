/**
 * Generic quiz screen — renders any question type based on config.
 * All questions & answer options are defined in: data/onboardingQuestions.ts
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { DrumRoller } from './ui/DrumRoller';
import { DaySelector } from './ui/DaySelector';
import { SliderInput } from './ui/SliderInput';
import { DualTimePicker } from './ui/DualTimePicker';
import type { QuestionConfig } from '@/data/onboardingQuestions';
import type { OnboardingData } from '@/hooks/useOnboarding';

interface QuizScreenProps {
  config: QuestionConfig;
  progress: number;
  data: OnboardingData;
  modeBadge?: { icon: string; name: string; color: string };
  onAnswer: (key: string, nestedKey: string | undefined, value: any) => void;
  onNext: () => void;
}

export function QuizScreen({ config, progress, data, modeBadge, onAnswer, onNext }: QuizScreenProps) {
  const { haptic } = useTelegram();

  // Get current value from data
  const getCurrentValue = (): any => {
    const parent = data[config.dataKey as keyof OnboardingData] as Record<string, any> | undefined;
    if (config.nestedKey && parent) {
      return parent[config.nestedKey];
    }
    return parent;
  };

  const currentValue = getCurrentValue();

  // Single select state
  const [singleValue, setSingleValue] = useState<string>(
    config.type === 'single-select' ? (currentValue as string) || '' : ''
  );

  // Multi select state
  const [multiValue, setMultiValue] = useState<string[]>(
    config.type === 'multi-select' ? (currentValue as string[]) || [] : []
  );

  // Drum roller state
  const [drumValue, setDrumValue] = useState<number>(
    config.type === 'drum-roller'
      ? typeof currentValue === 'object'
        ? currentValue?.value ?? config.defaultValue ?? config.min ?? 0
        : (currentValue as number) ?? config.defaultValue ?? config.min ?? 0
      : 0
  );

  // Slider state
  const [sliderValue, setSliderValue] = useState<number>(
    config.type === 'slider' ? (currentValue as number) ?? config.defaultValue ?? config.min ?? 1 : 1
  );

  // Day selector state
  const [daysValue, setDaysValue] = useState<string[]>(
    config.type === 'day-grid' ? (currentValue as string[]) || [] : []
  );

  // Dual time state
  const [wakeTime, setWakeTime] = useState<number>(7);
  const [sleepTime, setSleepTime] = useState<number>(23);

  useEffect(() => {
    if (config.type === 'dual-time') {
      const hydration = data.hydration;
      if (hydration?.wake_time) {
        setWakeTime(parseInt(hydration.wake_time.split(':')[0]) || 7);
      }
      if (hydration?.sleep_time) {
        setSleepTime(parseInt(hydration.sleep_time.split(':')[0]) || 23);
      }
    }
  }, [config.type, data.hydration]);

  // Persist default values on mount so skipping still saves the answer
  useEffect(() => {
    if (currentValue !== undefined) return; // already has a saved value
    if (config.type === 'drum-roller') {
      handleDrumChange(drumValue);
    } else if (config.type === 'slider') {
      handleSliderChange(sliderValue);
    } else if (config.type === 'dual-time') {
      handleTimeChange('wake', wakeTime);
      handleTimeChange('sleep', sleepTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Validation
  const isValid = (): boolean => {
    switch (config.type) {
      case 'single-select':
        return singleValue !== '';
      case 'multi-select':
        return multiValue.length > 0;
      case 'drum-roller':
        return true;
      case 'slider':
        return true;
      case 'day-grid': {
        const freq = (data.fitness?.workout_frequency as number) || 0;
        return freq > 0 ? daysValue.length === freq : daysValue.length > 0;
      }
      case 'dual-time':
        return true;
      default:
        return false;
    }
  };

  const handleSingleSelect = (value: string) => {
    haptic.selection();
    setSingleValue(value);
    onAnswer(config.dataKey, config.nestedKey, value);
  };

  const handleMultiSelect = (value: string) => {
    haptic.selection();
    let next: string[];

    // Auto-select-all behavior
    if (config.autoSelectAll && value === config.autoSelectAll) {
      const allValues = config.options!.map((o) => o.value);
      next = multiValue.includes(value) ? [] : allValues;
    } else {
      next = multiValue.includes(value)
        ? multiValue.filter((v) => v !== value)
        : [...multiValue.filter((v) => v !== config.autoSelectAll), value];
    }

    setMultiValue(next);
    onAnswer(config.dataKey, config.nestedKey, next);
  };

  const handleDrumChange = (value: number) => {
    setDrumValue(value);
    if (config.unit) {
      onAnswer(config.dataKey, config.nestedKey, { value, unit: config.unit });
    } else {
      onAnswer(config.dataKey, config.nestedKey, value);
    }
  };

  const handleSliderChange = (value: number) => {
    setSliderValue(value);
    onAnswer(config.dataKey, config.nestedKey, value);
  };

  const handleDaysChange = (days: string[]) => {
    setDaysValue(days);
    onAnswer(config.dataKey, config.nestedKey, days);
  };

  const handleTimeChange = (type: 'wake' | 'sleep', hour: number) => {
    if (type === 'wake') {
      setWakeTime(hour);
      onAnswer('hydration', 'wake_time', `${String(hour).padStart(2, '0')}:00`);
    } else {
      const displayHour = hour > 23 ? hour - 24 : hour;
      setSleepTime(hour);
      onAnswer('hydration', 'sleep_time', `${String(displayHour).padStart(2, '0')}:00`);
    }
  };

  const handleNext = () => {
    haptic.impact('medium');
    onNext();
  };

  // Determine grid layout for options
  const useGrid = config.options && config.options.length >= 6;

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} />

      {/* Mode badge */}
      {modeBadge && (
        <div className="flex justify-center pt-1 pb-2">
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${modeBadge.color}`}>
            {modeBadge.icon} {modeBadge.name}
          </span>
        </div>
      )}

      <div className="flex-1 flex flex-col px-6 pt-4">
        <motion.div
          key={config.step}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-2xl font-bold text-telegram-text text-center mb-1">
            {config.title}
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            {config.subtitle}
          </p>

          {/* Single Select */}
          {config.type === 'single-select' && config.options && (
            <div className="space-y-2">
              {config.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSingleSelect(option.value)}
                  className={`
                    w-full py-3.5 px-4 rounded-xl text-left transition-all flex items-center gap-3
                    ${
                      singleValue === option.value
                        ? 'bg-telegram-link/15 border-2 border-telegram-link'
                        : 'bg-telegram-secondaryBg border-2 border-transparent'
                    }
                  `}
                >
                  {option.icon && <span className="text-sm">{option.icon}</span>}
                  <div>
                    <span className={`font-semibold block ${
                      singleValue === option.value ? 'text-telegram-link' : 'text-telegram-text'
                    }`}>
                      {option.label}
                    </span>
                    {option.sublabel && (
                      <span className="text-xs text-telegram-hint">{option.sublabel}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Multi Select */}
          {config.type === 'multi-select' && config.options && (
            <div className={useGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
              {config.options.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleMultiSelect(option.value)}
                  className={`
                    w-full py-3 px-4 rounded-xl text-left transition-all
                    ${
                      multiValue.includes(option.value)
                        ? 'bg-telegram-link/15 border-2 border-telegram-link'
                        : 'bg-telegram-secondaryBg border-2 border-transparent'
                    }
                  `}
                >
                  <span className={`font-semibold block text-sm ${
                    multiValue.includes(option.value) ? 'text-telegram-link' : 'text-telegram-text'
                  }`}>
                    {option.label}
                  </span>
                  {option.sublabel && (
                    <span className="text-xs text-telegram-hint">{option.sublabel}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Drum Roller */}
          {config.type === 'drum-roller' && (
            <div className="mt-4">
              <DrumRoller
                min={config.min!}
                max={config.max!}
                value={drumValue}
                onChange={handleDrumChange}
              />
              {config.formatValue && (
                <p className="text-center text-sm text-telegram-link mt-4 font-medium">
                  {config.formatValue(drumValue)}
                </p>
              )}
            </div>
          )}

          {/* Slider */}
          {config.type === 'slider' && (
            <div className="mt-4">
              <SliderInput
                min={config.min!}
                max={config.max!}
                step={config.step_size || 1}
                value={sliderValue}
                onChange={handleSliderChange}
                flavorText={config.flavorText}
                valueLabel={config.valueLabel}
                valueSuffix={config.valueSuffix}
              />
            </div>
          )}

          {/* Day Grid */}
          {config.type === 'day-grid' && (
            <div className="mt-4">
              <DaySelector
                selected={daysValue}
                onChange={handleDaysChange}
                requiredCount={data.fitness?.workout_frequency}
              />
            </div>
          )}

          {/* Dual Time Picker */}
          {config.type === 'dual-time' && (
            <div className="mt-4">
              <DualTimePicker
                wakeTime={wakeTime}
                sleepTime={sleepTime}
                onWakeChange={(h) => handleTimeChange('wake', h)}
                onSleepChange={(h) => handleTimeChange('sleep', h)}
              />
            </div>
          )}
        </motion.div>
      </div>

      <div className="px-6 pb-8">
        <button
          onClick={handleNext}
          disabled={!isValid()}
          className={`
            w-full py-4 rounded-2xl text-lg font-bold transition-all
            ${
              isValid()
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
