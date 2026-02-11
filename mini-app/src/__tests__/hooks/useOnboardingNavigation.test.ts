import { describe, it, expect } from 'vitest';
import {
  buildStepSequence,
  getAllSteps,
  calculateProgress,
  getStepLabel,
} from '@/hooks/useOnboardingNavigation';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('useOnboardingNavigation', () => {
  it('buildStepSequence returns base steps when no modes selected', () => {
    const steps = buildStepSequence([]);

    // Should have: splash, hero_intro, avatar, paths, referral + convergence (punishments, notifications, summary, launch)
    expect(steps[0]).toBe('splash');
    expect(steps[4]).toBe('referral');
    expect(steps).toContain('punishments');
    expect(steps).toContain('notifications');
    expect(steps).toContain('summary');
    expect(steps).toContain('launch');
    expect(steps).toHaveLength(9); // 5 base + 4 convergence
  });

  it('getAllSteps includes fitness steps when fitness mode selected', () => {
    const data: OnboardingData = { selected_modes: ['fitness'] };
    const steps = getAllSteps(data);

    expect(steps).toContain('fitness_motivation');
    expect(steps).toContain('fitness_focus');
    expect(steps).toContain('fitness_level');
    expect(steps).toContain('fitness_time');
    // Fitness has 12 steps
    expect(steps).toHaveLength(9 + 12); // base + fitness
  });

  it('step list changes when multiple modes are selected', () => {
    const singleMode: OnboardingData = { selected_modes: ['hydration'] };
    const multiMode: OnboardingData = { selected_modes: ['hydration', 'finance'] };

    const singleSteps = getAllSteps(singleMode);
    const multiSteps = getAllSteps(multiMode);

    expect(multiSteps.length).toBeGreaterThan(singleSteps.length);

    // Multi-mode should contain both hydration and finance steps
    expect(multiSteps).toContain('hydration_intake');
    expect(multiSteps).toContain('finance_goals');

    // Single-mode should only have hydration, not finance
    expect(singleSteps).toContain('hydration_intake');
    expect(singleSteps).not.toContain('finance_goals');
  });

  it('calculateProgress returns correct percentage', () => {
    const data: OnboardingData = { selected_modes: [] };
    // With no modes: 9 steps total (indices 0..8)

    // First step (index 0) → 0%
    expect(calculateProgress('splash', data)).toBe(0);

    // Last step (index 8) → 100%
    expect(calculateProgress('launch', data)).toBe(100);

    // Middle step: referral is index 4 out of 8 → round(4/8*100) = 50%
    expect(calculateProgress('referral', data)).toBe(50);
  });

  it('getStepLabel returns human-friendly label', () => {
    const data: OnboardingData = { selected_modes: [] };

    expect(getStepLabel('splash', data)).toBe('Step 1 of 9');
    expect(getStepLabel('launch', data)).toBe('Step 9 of 9');

    // Non-existent step returns empty
    expect(getStepLabel('completed', data)).toBe('');
  });
});
