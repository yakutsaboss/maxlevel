/**
 * Generic quiz screen — renders any question type based on config.
 * All questions & answer options are defined in: data/onboardingQuestions.ts
 * Strings are i18n keys resolved here via t().
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { useTelegram } from '@/hooks/useTelegram';
import { ProgressBar } from './ui/ProgressBar';
import { ContinueButton } from './ui/ContinueButton';
import { AnswerInput } from './quiz/AnswerInput';
import { useQuizState } from './quiz/useQuizState';
import type { QuestionConfig } from '@/data/onboardingQuestions';
import type { OnboardingData } from '@/hooks/useOnboarding';
import type { QuizAnswerValue } from '@/types/telegram';

interface QuizScreenProps {
  config: QuestionConfig;
  progress: number;
  stepLabel?: string;
  data: OnboardingData;
  modeBadge?: { icon: string; name: string; color: string };
  onAnswer: (key: string, nestedKey: string | undefined, value: QuizAnswerValue) => void;
  onNext: () => void;
}

export function QuizScreen({ config, progress, stepLabel, data, modeBadge, onAnswer, onNext }: QuizScreenProps) {
  const { t } = useTranslation();
  const { haptic } = useTelegram();
  const state = useQuizState(config, data, onAnswer, haptic);

  // Translate i18n keys in options, flavorText so AnswerInput gets resolved strings
  const translatedConfig = useMemo((): QuestionConfig => ({
    ...config,
    options: config.options?.map((opt) => ({
      ...opt,
      label: t(opt.label),
      sublabel: opt.sublabel ? t(opt.sublabel) : undefined,
    })),
    flavorText: config.flavorText
      ? Object.fromEntries(Object.entries(config.flavorText).map(([k, v]) => [k, t(v)]))
      : undefined,
    valueLabel: config.valueSuffix
      ? (v: number) => `${config.valueLabel ? config.valueLabel(v) : v} ${t(config.valueSuffix!)}`
      : config.valueLabel,
  }), [config, t]);

  const handleNext = () => {
    haptic.impact('medium');
    onNext();
  };

  return (
    <div className="min-h-screen flex flex-col bg-telegram-bg">
      <ProgressBar progress={progress} stepLabel={stepLabel} />

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
            {t(config.title)}
          </h2>
          <p className="text-telegram-hint text-center mb-6">
            {t(config.subtitle)}
          </p>

          <AnswerInput
            config={translatedConfig}
            singleValue={state.singleValue}
            multiValue={state.multiValue}
            drumValue={state.drumValue}
            sliderValue={state.sliderValue}
            daysValue={state.daysValue}
            wakeTime={state.wakeTime}
            sleepTime={state.sleepTime}
            requiredDayCount={state.requiredDayCount}
            onSingleSelect={state.handleSingleSelect}
            onMultiSelect={state.handleMultiSelect}
            onDrumChange={state.handleDrumChange}
            onSliderChange={state.handleSliderChange}
            onDaysChange={state.handleDaysChange}
            onTimeChange={state.handleTimeChange}
          />
        </motion.div>
      </div>

      <div className="px-6 pb-8">
        <ContinueButton onClick={handleNext} disabled={!state.isValid} />
      </div>
    </div>
  );
}
