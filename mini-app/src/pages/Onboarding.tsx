/**
 * Main onboarding orchestrator — renders the correct screen per step.
 * All questions & answer options are defined in: data/onboardingQuestions.ts
 * Flow logic lives in: hooks/useOnboardingFlow.ts
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { getQuestionForStep } from '@/data/onboardingQuestions';
import type { OnboardingStep } from '@/hooks/useOnboarding';

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

/** Renders the component for the given onboarding step. */
function StepRenderer({
  step,
  flow,
}: {
  step: OnboardingStep;
  flow: ReturnType<typeof useOnboardingFlow>;
}) {
  const navigate = useNavigate();
  const { store, progress, stepLabel, goToStep, advanceFrom, handleAnswer, getModeBadge, handleLaunch, telegramId } = flow;

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
      // Quiz screens (fitness_*, hydration_*, finance_*, learning_*)
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

      return (
        <div className="min-h-screen flex items-center justify-center bg-telegram-bg">
          <p className="text-telegram-hint">Unknown step: {step}</p>
        </div>
      );
    }
  }
}

export function Onboarding() {
  const flow = useOnboardingFlow();
  const { mounted, telegramId, saveStatus, store } = flow;

  // Show error screen if Telegram user is not available after mount
  if (mounted && !telegramId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-telegram-bg">
        <p className="text-xl font-semibold text-telegram-text mb-2">Not Available</p>
        <p className="text-telegram-hint text-center">Please open this app from Telegram.</p>
      </div>
    );
  }

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

      <AnimatePresence mode="sync">
        <motion.div
          key={store.currentStep}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <StepRenderer step={store.currentStep} flow={flow} />
        </motion.div>
      </AnimatePresence>
    </>
  );
}
