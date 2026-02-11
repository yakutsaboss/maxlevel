import { useState, useEffect } from 'react';
import type { QuestionConfig } from '@/data/onboardingQuestions';
import type { OnboardingData } from '@/hooks/useOnboarding';
import type { QuizAnswerValue } from '@/types/telegram';

export function useQuizState(
  config: QuestionConfig,
  data: OnboardingData,
  onAnswer: (key: string, nestedKey: string | undefined, value: QuizAnswerValue) => void,
  haptic: { selection: () => void },
) {
  const getCurrentValue = (): QuizAnswerValue | undefined => {
    const parent = data[config.dataKey as keyof OnboardingData] as Record<string, QuizAnswerValue | undefined> | undefined;
    if (config.nestedKey && parent) {
      return parent[config.nestedKey];
    }
    return parent as QuizAnswerValue | undefined;
  };

  const currentValue = getCurrentValue();

  // --- State per question type ---

  const [singleValue, setSingleValue] = useState<string>(
    config.type === 'single-select' ? (currentValue as string) || '' : '',
  );

  const [multiValue, setMultiValue] = useState<string[]>(
    config.type === 'multi-select' ? (currentValue as string[]) || [] : [],
  );

  const [drumValue, setDrumValue] = useState<number>(
    config.type === 'drum-roller'
      ? typeof currentValue === 'object'
        ? (currentValue as { value?: number })?.value ?? config.defaultValue ?? config.min ?? 0
        : (currentValue as number) ?? config.defaultValue ?? config.min ?? 0
      : 0,
  );

  const [sliderValue, setSliderValue] = useState<number>(
    config.type === 'slider' ? (currentValue as number) ?? config.defaultValue ?? config.min ?? 1 : 1,
  );

  const [daysValue, setDaysValue] = useState<string[]>(
    config.type === 'day-grid' ? (currentValue as string[]) || [] : [],
  );

  const [wakeTime, setWakeTime] = useState<number>(7);
  const [sleepTime, setSleepTime] = useState<number>(23);

  // --- Effects ---

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

  // --- Handlers ---

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

  // Persist default values on mount so skipping still saves the answer
  useEffect(() => {
    if (currentValue !== undefined) return;
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

  const getRequiredDayCount = (): number => {
    switch (config.dataKey) {
      case 'fitness': return (data.fitness?.workout_frequency as number) || 0;
      case 'learning': return (data.learning?.study_frequency as number) || 0;
      default: return 0;
    }
  };

  const requiredDayCount = getRequiredDayCount();

  const handleSingleSelect = (value: string) => {
    haptic.selection();
    setSingleValue(value);
    onAnswer(config.dataKey, config.nestedKey, value);
  };

  const handleMultiSelect = (value: string) => {
    haptic.selection();
    let next: string[];

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

  const handleDaysChange = (days: string[]) => {
    setDaysValue(days);
    onAnswer(config.dataKey, config.nestedKey, days);
  };

  // --- Validation ---

  const computeValid = (): boolean => {
    switch (config.type) {
      case 'single-select':
        return singleValue !== '';
      case 'multi-select':
        return multiValue.length > 0;
      case 'drum-roller':
      case 'slider':
      case 'dual-time':
        return true;
      case 'day-grid': {
        const freq = requiredDayCount;
        return freq > 0 ? daysValue.length === freq : daysValue.length > 0;
      }
      default:
        return false;
    }
  };

  return {
    singleValue,
    multiValue,
    drumValue,
    sliderValue,
    daysValue,
    wakeTime,
    sleepTime,
    requiredDayCount,
    isValid: computeValid(),
    handleSingleSelect,
    handleMultiSelect,
    handleDrumChange,
    handleSliderChange,
    handleDaysChange,
    handleTimeChange,
  };
}
