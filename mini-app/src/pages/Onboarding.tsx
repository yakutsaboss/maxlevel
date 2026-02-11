/**
 * Main onboarding orchestrator — renders the correct screen per step.
 * All questions & answer options are defined in: data/onboardingQuestions.ts
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useTelegram, useBackButton } from '@/hooks/useTelegram';
import { useOnboarding, getStepLabel, type OnboardingStep, type OnboardingData } from '@/hooks/useOnboarding';
import { apiClient } from '@/api/client';
import { getQuestionForStep } from '@/data/onboardingQuestions';
import { MODE_BADGES } from '@/data/modeBadges';

import { SplashScreen } from '@/components/onboarding/SplashScreen';
import { HeroIntro } from '@/components/onboarding/HeroIntro';
import { AvatarSelect } from '@/components/onboarding/AvatarSelect';
import { PathSelect } from '@/components/onboarding/PathSelect';
import { ReferralSource } from '@/components/onboarding/ReferralSource';
import { QuizScreen } from '@/components/onboarding/QuizScreen';
import { PunishmentConfig } from '@/components/onboarding/PunishmentConfig';
import { NotificationPrefs } from '@/components/onboarding/NotificationPrefs';
import { Summary } from '@/components/onboarding/Summary';
import { LaunchScreen } from '@/components/onboarding/LaunchScreen';
import { logger } from '@/utils/logger';
import type { QuizAnswerValue } from '@/types/telegram';

export function Onboarding() {
  const navigate = useNavigate();
  const { user } = useTelegram();
  const store = useOnboarding();
  const saveTimeout = useRef<ReturnType<typeof setTimeout>>();
  const saveStatusTimeout = useRef<ReturnType<typeof setTimeout>>();
  const [mounted, setMounted] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'failed'>('idle');

  const telegramId = user?.id;

  useEffect(() => { setMounted(true); }, []);

  // Show error screen if Telegram user is not available after mount
  if (mounted && !telegramId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-telegram-bg">
        <p className="text-xl font-semibold text-telegram-text mb-2">Not Available</p>
        <p className="text-telegram-hint text-center">Please open this app from Telegram.</p>
      </div>
    );
  }

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
        // Check showIf condition
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

  // Render current step
  const renderStep = () => {
    const step = store.currentStep;

    switch (step) {
      case 'splash':
        return <SplashScreen onNext={() => goToStep('hero_intro')} />;

      case 'hero_intro':
        return (
          <HeroIntro
            progress={progress}
            stepLabel={stepLabel}
            nickname={store.data.nickname}
            onNicknameChange={(name) => store.updateData({ nickname: name })}
            onNext={() => goToStep('avatar')}
          />
        );

      case 'avatar':
        return (
          <AvatarSelect
            progress={progress}
            stepLabel={stepLabel}
            value={store.data.gender}
            onSelect={(g) => store.updateData({ gender: g })}
            onNext={() => goToStep('paths')}
          />
        );

      case 'paths':
        return (
          <PathSelect
            progress={progress}
            stepLabel={stepLabel}
            value={store.data.selected_modes}
            onSelect={(modes) => store.updateData({ selected_modes: modes })}
            onNext={() => goToStep('referral')}
          />
        );

      case 'referral':
        return (
          <ReferralSource
            progress={progress}
            stepLabel={stepLabel}
            value={store.data.referral_source}
            otherValue={store.data.referral_source_other}
            onSelect={(src, other) =>
              store.updateData({ referral_source: src, referral_source_other: other })
            }
            onNext={() => advanceFrom('referral')}
          />
        );

      case 'punishments':
        return (
          <PunishmentConfig
            progress={progress}
            stepLabel={stepLabel}
            data={store.data}
            onUpdate={(p) => store.updateData({ punishments: p })}
            onNext={() => goToStep('notifications')}
          />
        );

      case 'notifications':
        return (
          <NotificationPrefs
            progress={progress}
            stepLabel={stepLabel}
            data={store.data}
            onUpdate={(n) => store.updateData({ notification_preferences: n })}
            onNext={() => goToStep('summary')}
          />
        );

      case 'summary':
        return (
          <Summary
            progress={progress}
            stepLabel={stepLabel}
            data={store.data}
            onEdit={(editStep) => goToStep(editStep as OnboardingStep)}
            onNext={() => goToStep('launch')}
          />
        );

      case 'launch':
        return (
          <LaunchScreen
            data={store.data}
            telegramId={telegramId!}
            onLaunch={handleLaunch}
          />
        );

      case 'completed':
        navigate('/dashboard', { replace: true });
        return null;

      default: {
        // Quiz screens (fitness_*, hydration_*)
        const questionConfig = getQuestionForStep(step);
        if (questionConfig) {
          return (
            <QuizScreen
              key={step}
              config={questionConfig}
              progress={progress}
              stepLabel={stepLabel}
              data={store.data}
              modeBadge={getModeBadge(step)}
              onAnswer={handleAnswer}
              onNext={() => advanceFrom(step)}
            />
          );
        }

        // Fallback
        return (
          <div className="min-h-screen flex items-center justify-center bg-telegram-bg">
            <p className="text-telegram-hint">Unknown step: {step}</p>
          </div>
        );
      }
    }
  };

  return (
    <>
      {/* Save status indicator */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-1 left-1/2 -translate-x-1/2 z-50"
          >
            <span
              className={`text-xs font-medium px-3 py-1 rounded-full backdrop-blur-sm ${
                saveStatus === 'saved'
                  ? 'bg-green-500/15 text-green-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}
            >
              {saveStatus === 'saved' ? 'Saved \u2713' : 'Save failed \u2014 will retry'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        <motion.div
          key={store.currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {renderStep()}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
