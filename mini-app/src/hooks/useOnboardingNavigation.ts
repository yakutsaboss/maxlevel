/**
 * Onboarding step navigation logic — extracted from useOnboarding.ts.
 * Contains: step sequence building, step indexing, and progress calculation.
 */

import type { OnboardingStep, OnboardingData } from './useOnboarding';

export function buildStepSequence(selectedModes: string[]): OnboardingStep[] {
  const steps: OnboardingStep[] = [
    'splash',
    'hero_intro',
    'avatar',
    'paths',
    'referral',
  ];

  if (selectedModes.includes('fitness')) {
    steps.push(
      'fitness_motivation',
      'fitness_focus',
      'fitness_level',
      'fitness_activity',
      'fitness_age',
      'fitness_height',
      'fitness_weight',
      'fitness_target_weight',
      'fitness_equipment',
      'fitness_frequency',
      'fitness_days',
      'fitness_time'
    );
  }

  if (selectedModes.includes('hydration')) {
    steps.push(
      'hydration_intake',
      'hydration_goals',
      'hydration_target',
      'hydration_reminder',
      'hydration_schedule',
      'hydration_vessel',
      'hydration_barriers'
    );
  }

  if (selectedModes.includes('finance')) {
    steps.push(
      'finance_goals',
      'finance_income',
      'finance_spending',
      'finance_savings_target',
      'finance_frequency'
    );
  }

  if (selectedModes.includes('learning')) {
    steps.push(
      'learning_goals',
      'learning_style',
      'learning_time',
      'learning_frequency',
      'learning_days',
      'learning_resources'
    );
  }

  if (selectedModes.includes('medication')) {
    steps.push(
      'medication_count',
      'medication_types',
      'medication_schedule',
      'medication_goals',
      'medication_barriers',
      'medication_reminders'
    );
  }

  if (selectedModes.includes('habits')) {
    steps.push(
      'habits_type',
      'habits_frequency',
      'habits_count',
      'habits_trigger',
      'habits_goals',
      'habits_barriers'
    );
  }

  steps.push('punishments', 'notifications', 'summary', 'launch');

  return steps;
}

export function getAllSteps(data: OnboardingData): OnboardingStep[] {
  return buildStepSequence(data.selected_modes || []);
}

export function getCurrentStepIndex(currentStep: OnboardingStep, data: OnboardingData): number {
  return getAllSteps(data).indexOf(currentStep);
}

export function getTotalSteps(data: OnboardingData): number {
  return getAllSteps(data).length;
}

export function calculateProgress(currentStep: OnboardingStep, data: OnboardingData): number {
  const index = getCurrentStepIndex(currentStep, data);
  const total = getTotalSteps(data);
  if (total <= 1) return 0;
  return Math.round((index / (total - 1)) * 100);
}

/** Human-friendly step label: "Step 3 of 12" */
export function getStepLabel(currentStep: OnboardingStep, data: OnboardingData): string {
  const index = getCurrentStepIndex(currentStep, data);
  const total = getTotalSteps(data);
  if (index < 0) return '';
  return `Step ${index + 1} of ${total}`;
}
