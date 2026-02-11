/**
 * Orchestration hook for the Onboarding page.
 * Handles: save/load state, step navigation, quiz answers, launch completion.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useOnboarding, getStepLabel, type OnboardingStep, type OnboardingData } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import { getQuestionForStep } from '@/data/onboardingQuestions';
import { MODE_BADGES } from '@/data/modeBadges';
import { logger } from '@/utils/logger';
import type { QuizAnswerValue } from '@/types/telegram';

export function useOnboardingFlow() {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const store = useOnboarding();
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const saveStatusTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle');

  const telegramId = user?.id;

  useEffect(() => { setMounted(true); }, []);

  // Save state to backend (debounced)
  const saveState = useCallback(
    (step: OnboardingStep, data: OnboardingData) => {
      if (!telegramId) return;
      clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => {
        apiClient
          .saveOnboardingState(telegramId, step, data as Record<string, unknown>)
          .then(() => {
            setSaveStatus('saved');
            clearTimeout(saveStatusTimeout.current);
            saveStatusTimeout.current = setTimeout(() => setSaveStatus('idle'), 2000);
          })
          .catch((err) => {
            logger.error('Failed to save onboarding state', { error: err });
            setSaveStatus('failed');
            clearTimeout(saveStatusTimeout.current);
            saveStatusTimeout.current = setTimeout(() => setSaveStatus('idle'), 3000);
          });
      }, 1000);
    },
    [telegramId]
  );

  // Load saved state on mount
  useEffect(() => {
    if (!telegramId) return;
    (async () => {
      try {
        const res = await apiClient.getOnboardingState(telegramId);
        if (res.success && res.data?.current_step && res.data.current_step !== 'completed') {
          store.restoreState(
            res.data.current_step as OnboardingStep,
            res.data.quiz_data || {}
          );
        }
      } catch {
        // Fresh start
      }
    })();
  }, [telegramId]);

  // Navigate to next step
  const goToStep = useCallback(
    (step: OnboardingStep) => {
      store.setStep(step);
      saveState(step, store.data);
    },
    [store, saveState]
  );

  // Get the next step in sequence, respecting conditional logic
  const getNextStep = useCallback(
    (current: OnboardingStep): OnboardingStep => {
      const allSteps = store.getAllSteps();
      const currentIndex = allSteps.indexOf(current);

      for (let i = currentIndex + 1; i < allSteps.length; i++) {
        const step = allSteps[i];
        const questionConfig = getQuestionForStep(step);
        if (questionConfig?.showIf && !questionConfig.showIf(store.data)) {
          continue;
        }
        return step;
      }

      return 'launch';
    },
    [store]
  );

  const advanceFrom = useCallback(
    (current: OnboardingStep) => {
      const next = getNextStep(current);
      goToStep(next);
    },
    [getNextStep, goToStep]
  );

  // Handle quiz answer
  const handleAnswer = useCallback(
    (dataKey: string, nestedKey: string | undefined, value: QuizAnswerValue) => {
      if (nestedKey) {
        store.updateNestedData(dataKey as keyof OnboardingData, { [nestedKey]: value });
      } else {
        store.updateData({ [dataKey]: value });
      }
    },
    [store]
  );

  // Get mode badge for current step
  const getModeBadge = (step: OnboardingStep) => {
    if (step.startsWith('fitness_')) return MODE_BADGES.fitness;
    if (step.startsWith('hydration_')) return MODE_BADGES.hydration;
    if (step.startsWith('finance_')) return MODE_BADGES.finance;
    if (step.startsWith('learning_')) return MODE_BADGES.learning;
    return undefined;
  };

  // Back button handler — hidden on splash so Telegram shows "Close" in the frame
  useBackButton(
    useCallback(() => {
      store.goBack();
    }, [store]),
    store.currentStep !== 'splash'
  );

  // Progress calculation
  const progress = store.getProgress();
  const stepLabel = getStepLabel(store.currentStep, store.data);

  // Handle launch completion
  const handleLaunch = useCallback(() => {
    store.setCompleted();
    navigate('/dashboard', { replace: true });
  }, [store, navigate]);

  return {
    mounted,
    telegramId,
    saveStatus,
    store,
    progress,
    stepLabel,
    goToStep,
    advanceFrom,
    handleAnswer,
    getModeBadge,
    handleLaunch,
  };
}
