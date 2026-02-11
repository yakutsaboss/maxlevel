/**
 * Onboarding state management (Zustand store).
 * Questions & answers are defined in: data/onboardingQuestions.ts
 * Navigation logic is in: hooks/useOnboardingNavigation.ts
 */

import { create } from 'zustand';
import {
  buildStepSequence,
  getAllSteps,
  getCurrentStepIndex,
  getTotalSteps,
  calculateProgress,
} from './useOnboardingNavigation';

// Re-export navigation utilities so existing imports don't break
export {
  buildStepSequence,
  getAllSteps,
  getCurrentStepIndex,
  getTotalSteps,
  calculateProgress,
  getStepLabel,
} from './useOnboardingNavigation';

export type OnboardingStep =
  | 'splash'
  | 'hero_intro'
  | 'avatar'
  | 'paths'
  | 'referral'
  // Fitness
  | 'fitness_motivation'
  | 'fitness_focus'
  | 'fitness_level'
  | 'fitness_activity'
  | 'fitness_age'
  | 'fitness_height'
  | 'fitness_weight'
  | 'fitness_target_weight'
  | 'fitness_equipment'
  | 'fitness_frequency'
  | 'fitness_days'
  | 'fitness_time'
  // Hydration
  | 'hydration_intake'
  | 'hydration_goals'
  | 'hydration_target'
  | 'hydration_reminder'
  | 'hydration_schedule'
  | 'hydration_vessel'
  | 'hydration_barriers'
  // Finance
  | 'finance_goals'
  | 'finance_income'
  | 'finance_spending'
  | 'finance_savings_target'
  | 'finance_frequency'
  // Learning
  | 'learning_goals'
  | 'learning_style'
  | 'learning_time'
  | 'learning_frequency'
  | 'learning_days'
  | 'learning_resources'
  // Convergence
  | 'punishments'
  | 'notifications'
  | 'summary'
  | 'launch'
  | 'completed';

export interface OnboardingData {
  gender?: string;
  nickname?: string;
  selected_modes?: string[];
  referral_source?: string;
  referral_source_other?: string;

  // Fitness quiz responses
  fitness?: {
    motivation?: string[];
    focus_areas?: string[];
    fitness_level?: string;
    activity_level?: string;
    age?: number;
    height?: { value: number; unit: string };
    current_weight?: { value: number; unit: string };
    target_weight?: { value: number; unit: string };
    equipment?: string[];
    workout_frequency?: number;
    workout_days?: string[];
    preferred_time?: string;
  };

  // Hydration quiz responses
  hydration?: {
    current_intake?: string;
    goals?: string[];
    daily_target?: number;
    reminder_frequency?: string;
    wake_time?: string;
    sleep_time?: string;
    container?: string;
    barriers?: string[];
  };

  // Finance quiz responses
  finance?: {
    goals?: string[];
    income_level?: string;
    spending_categories?: string[];
    savings_target?: number;
    tracking_frequency?: string;
  };

  // Learning quiz responses
  learning?: {
    goals?: string[];
    learning_style?: string;
    daily_minutes?: number;
    study_frequency?: number;
    study_days?: string[];
    resources?: string[];
  };

  // Pain points
  pain_points?: {
    hydration?: string[];
  };

  // Punishments
  punishments?: {
    consent_given?: boolean;
    punishment_type?: 'workout' | 'book' | 'money' | null;
    difficulty?: 'easy' | 'medium' | 'hard' | 'extreme';
    intensity_level?: string; // backward compat — maps to difficulty on backend
    safe_mode?: boolean;
    custom_punishments?: Record<string, string[]>;
  };

  // Notifications
  notification_preferences?: {
    quest_reminders?: boolean;
    daily_summary?: boolean;
    achievement_alerts?: boolean;
    streak_warnings?: boolean;
  };
}

interface OnboardingStore {
  currentStep: OnboardingStep;
  data: OnboardingData;
  stepHistory: OnboardingStep[];
  isLoading: boolean;
  isCompleted: boolean;

  setStep: (step: OnboardingStep) => void;
  goBack: () => void;
  updateData: (partial: Partial<OnboardingData>) => void;
  updateNestedData: <K extends keyof OnboardingData>(
    key: K,
    value: Partial<NonNullable<OnboardingData[K]>>
  ) => void;
  setLoading: (loading: boolean) => void;
  setCompleted: () => void;
  reset: () => void;
  restoreState: (step: OnboardingStep, data: OnboardingData) => void;
  getAllSteps: () => OnboardingStep[];
  getCurrentStepIndex: () => number;
  getTotalSteps: () => number;
  getProgress: () => number;
}

export const useOnboarding = create<OnboardingStore>((set, get) => ({
  currentStep: 'splash',
  data: {},
  stepHistory: ['splash'],
  isLoading: false,
  isCompleted: false,

  setStep: (step) => {
    set((state) => ({
      currentStep: step,
      stepHistory: [...state.stepHistory, step],
    }));
  },

  goBack: () => {
    const { stepHistory } = get();
    if (stepHistory.length <= 1) return;

    const newHistory = stepHistory.slice(0, -1);
    set({
      currentStep: newHistory[newHistory.length - 1],
      stepHistory: newHistory,
    });
  },

  updateData: (partial) => {
    set((state) => ({
      data: { ...state.data, ...partial },
    }));
  },

  updateNestedData: (key, value) => {
    set((state) => ({
      data: {
        ...state.data,
        [key]: { ...(state.data[key] as object || {}), ...value },
      },
    }));
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setCompleted: () => set({ isCompleted: true, currentStep: 'completed' }),

  reset: () =>
    set({
      currentStep: 'splash',
      data: {},
      stepHistory: ['splash'],
      isLoading: false,
      isCompleted: false,
    }),

  restoreState: (step, data) => {
    const allStepsArr = buildStepSequence(data.selected_modes || []);
    const stepIndex = allStepsArr.indexOf(step);
    const history = stepIndex >= 0
      ? allStepsArr.slice(0, stepIndex + 1)
      : [step];

    set({
      currentStep: step,
      data,
      stepHistory: history,
      isLoading: false,
    });
  },

  getAllSteps: () => {
    const { data } = get();
    return getAllSteps(data);
  },

  getCurrentStepIndex: () => {
    const { currentStep, data } = get();
    return getCurrentStepIndex(currentStep, data);
  },

  getTotalSteps: () => {
    const { data } = get();
    return getTotalSteps(data);
  },

  getProgress: () => {
    const { currentStep, data } = get();
    return calculateProgress(currentStep, data);
  },
}));
