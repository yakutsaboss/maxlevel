import { DrumRoller } from '../ui/DrumRoller';
import { DaySelector } from '../ui/DaySelector';
import { SliderInput } from '../ui/SliderInput';
import { DualTimePicker } from '../ui/DualTimePicker';
import type { QuestionConfig } from '@/data/onboardingQuestions';

interface AnswerInputProps {
  config: QuestionConfig;
  singleValue: string;
  multiValue: string[];
  drumValue: number;
  sliderValue: number;
  daysValue: string[];
  wakeTime: number;
  sleepTime: number;
  requiredDayCount: number;
  onSingleSelect: (value: string) => void;
  onMultiSelect: (value: string) => void;
  onDrumChange: (value: number) => void;
  onSliderChange: (value: number) => void;
  onDaysChange: (days: string[]) => void;
  onTimeChange: (type: 'wake' | 'sleep', hour: number) => void;
}

export function AnswerInput({
  config, singleValue, multiValue, drumValue, sliderValue, daysValue,
  wakeTime, sleepTime, requiredDayCount,
  onSingleSelect, onMultiSelect, onDrumChange, onSliderChange, onDaysChange, onTimeChange,
}: AnswerInputProps) {
  const useGrid = config.options && config.options.length >= 6;

  switch (config.type) {
    case 'single-select':
      return config.options ? (
        <div className="space-y-2">
          {config.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onSingleSelect(option.value)}
              className={`
                w-full py-3.5 px-4 rounded-xl text-left transition-all flex items-center gap-3
                ${singleValue === option.value
                  ? 'bg-telegram-link/15 border-2 border-telegram-link'
                  : 'bg-telegram-secondaryBg border-2 border-transparent'}
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
      ) : null;

    case 'multi-select':
      return config.options ? (
        <div className={useGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
          {config.options.map((option) => (
            <button
              key={option.value}
              onClick={() => onMultiSelect(option.value)}
              className={`
                w-full py-3 px-4 rounded-xl text-left transition-all
                ${multiValue.includes(option.value)
                  ? 'bg-telegram-link/15 border-2 border-telegram-link'
                  : 'bg-telegram-secondaryBg border-2 border-transparent'}
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
      ) : null;

    case 'drum-roller':
      return (
        <div className="mt-4">
          <DrumRoller
            min={config.min!}
            max={config.max!}
            value={drumValue}
            onChange={onDrumChange}
          />
          {config.formatValue && (
            <p className="text-center text-sm text-telegram-link mt-4 font-medium">
              {config.formatValue(drumValue)}
            </p>
          )}
        </div>
      );

    case 'slider':
      return (
        <div className="mt-4">
          <SliderInput
            min={config.min!}
            max={config.max!}
            step={config.step_size || 1}
            value={sliderValue}
            onChange={onSliderChange}
            flavorText={config.flavorText}
            valueLabel={config.valueLabel}
            valueSuffix={config.valueSuffix}
          />
        </div>
      );

    case 'day-grid':
      return (
        <div className="mt-4">
          <DaySelector
            selected={daysValue}
            onChange={onDaysChange}
            requiredCount={requiredDayCount || undefined}
          />
        </div>
      );

    case 'dual-time':
      return (
        <div className="mt-4">
          <DualTimePicker
            wakeTime={wakeTime}
            sleepTime={sleepTime}
            onWakeChange={(h) => onTimeChange('wake', h)}
            onSleepChange={(h) => onTimeChange('sleep', h)}
          />
        </div>
      );

    default:
      return null;
  }
}
