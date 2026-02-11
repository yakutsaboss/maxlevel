import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useQuizState } from '@/components/onboarding/quiz/useQuizState';
import type { QuestionConfig } from '@/data/onboardingQuestions';
import type { OnboardingData } from '@/hooks/useOnboarding';

const mockHaptic = { selection: vi.fn() };

function makeSingleSelectConfig(overrides?: Partial<QuestionConfig>): QuestionConfig {
  return {
    step: 'fitness_motivation' as any,
    title: 'Test Question',
    subtitle: 'Pick one',
    type: 'single-select',
    dataKey: 'fitness',
    nestedKey: 'fitness_level',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
    ...overrides,
  };
}

function makeMultiSelectConfig(overrides?: Partial<QuestionConfig>): QuestionConfig {
  return {
    step: 'fitness_motivation' as any,
    title: 'What are your goals?',
    subtitle: 'Pick many',
    type: 'multi-select',
    dataKey: 'fitness',
    nestedKey: 'motivation',
    options: [
      { value: 'lose_weight', label: 'Lose Weight' },
      { value: 'build_muscle', label: 'Build Muscle' },
      { value: 'stay_healthy', label: 'Stay Healthy' },
    ],
    ...overrides,
  };
}

const emptyData: OnboardingData = {};

describe('useQuizState', () => {
  it('initializes with empty single-select value', () => {
    const onAnswer = vi.fn();
    const { result } = renderHook(() =>
      useQuizState(makeSingleSelectConfig(), emptyData, onAnswer, mockHaptic),
    );

    expect(result.current.singleValue).toBe('');
    expect(result.current.isValid).toBe(false);
  });

  it('stores single-select answer via handleSingleSelect', () => {
    const onAnswer = vi.fn();
    const { result } = renderHook(() =>
      useQuizState(makeSingleSelectConfig(), emptyData, onAnswer, mockHaptic),
    );

    act(() => {
      result.current.handleSingleSelect('intermediate');
    });

    expect(result.current.singleValue).toBe('intermediate');
    expect(result.current.isValid).toBe(true);
    expect(onAnswer).toHaveBeenCalledWith('fitness', 'fitness_level', 'intermediate');
    expect(mockHaptic.selection).toHaveBeenCalled();
  });

  it('handles multi-select toggling correctly', () => {
    const onAnswer = vi.fn();
    const { result } = renderHook(() =>
      useQuizState(makeMultiSelectConfig(), emptyData, onAnswer, mockHaptic),
    );

    // Add first item
    act(() => {
      result.current.handleMultiSelect('lose_weight');
    });
    expect(result.current.multiValue).toEqual(['lose_weight']);
    expect(result.current.isValid).toBe(true);

    // Add second item
    act(() => {
      result.current.handleMultiSelect('build_muscle');
    });
    expect(result.current.multiValue).toEqual(['lose_weight', 'build_muscle']);

    // Remove first item (toggle off)
    act(() => {
      result.current.handleMultiSelect('lose_weight');
    });
    expect(result.current.multiValue).toEqual(['build_muscle']);
  });

  it('handles drum-roller numeric values', () => {
    const onAnswer = vi.fn();
    const config = makeSingleSelectConfig({
      type: 'drum-roller',
      nestedKey: 'age',
      min: 16,
      max: 80,
      defaultValue: 25,
    });

    const { result } = renderHook(() =>
      useQuizState(config, emptyData, onAnswer, mockHaptic),
    );

    act(() => {
      result.current.handleDrumChange(30);
    });

    expect(result.current.drumValue).toBe(30);
    // No unit — should pass raw number
    expect(onAnswer).toHaveBeenCalledWith('fitness', 'age', 30);
  });

  it('handles drum-roller with unit (object value)', () => {
    const onAnswer = vi.fn();
    const config = makeSingleSelectConfig({
      type: 'drum-roller',
      nestedKey: 'height',
      min: 100,
      max: 220,
      defaultValue: 170,
      unit: 'cm',
    });

    const { result } = renderHook(() =>
      useQuizState(config, emptyData, onAnswer, mockHaptic),
    );

    act(() => {
      result.current.handleDrumChange(180);
    });

    expect(result.current.drumValue).toBe(180);
    expect(onAnswer).toHaveBeenCalledWith('fitness', 'height', { value: 180, unit: 'cm' });
  });
});
