import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOnboarding } from '@/hooks/useOnboarding';

describe('useOnboarding (Zustand store)', () => {
  beforeEach(() => {
    // Reset store state before each test
    act(() => {
      useOnboarding.getState().reset();
    });
  });

  it('has correct initial state shape', () => {
    const { result } = renderHook(() => useOnboarding());

    expect(result.current.currentStep).toBe('splash');
    expect(result.current.data).toEqual({});
    expect(result.current.stepHistory).toEqual(['splash']);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });

  it('setStep updates currentStep and appends to history', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.setStep('hero_intro');
    });

    expect(result.current.currentStep).toBe('hero_intro');
    expect(result.current.stepHistory).toEqual(['splash', 'hero_intro']);
  });

  it('updateData stores partial data', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.updateData({ gender: 'male', nickname: 'Hero' });
    });

    expect(result.current.data.gender).toBe('male');
    expect(result.current.data.nickname).toBe('Hero');
  });

  it('reset clears all state back to initial', () => {
    const { result } = renderHook(() => useOnboarding());

    // Make some changes first
    act(() => {
      result.current.setStep('avatar');
      result.current.updateData({ gender: 'female', selected_modes: ['fitness'] });
      result.current.setLoading(true);
    });

    expect(result.current.currentStep).toBe('avatar');
    expect(result.current.data.gender).toBe('female');
    expect(result.current.isLoading).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.currentStep).toBe('splash');
    expect(result.current.data).toEqual({});
    expect(result.current.stepHistory).toEqual(['splash']);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isCompleted).toBe(false);
  });

  it('updateData with selected_modes adds/removes modes', () => {
    const { result } = renderHook(() => useOnboarding());

    // Add modes
    act(() => {
      result.current.updateData({ selected_modes: ['fitness', 'hydration'] });
    });
    expect(result.current.data.selected_modes).toEqual(['fitness', 'hydration']);

    // Replace with different modes (simulating mode removal)
    act(() => {
      result.current.updateData({ selected_modes: ['fitness'] });
    });
    expect(result.current.data.selected_modes).toEqual(['fitness']);
  });

  it('goBack navigates to previous step in history', () => {
    const { result } = renderHook(() => useOnboarding());

    act(() => {
      result.current.setStep('hero_intro');
      result.current.setStep('avatar');
    });

    expect(result.current.currentStep).toBe('avatar');
    expect(result.current.stepHistory).toEqual(['splash', 'hero_intro', 'avatar']);

    act(() => {
      result.current.goBack();
    });

    expect(result.current.currentStep).toBe('hero_intro');
    expect(result.current.stepHistory).toEqual(['splash', 'hero_intro']);

    // goBack at the start should be a no-op
    act(() => {
      result.current.goBack();
      result.current.goBack(); // try going past start
    });

    expect(result.current.currentStep).toBe('splash');
    expect(result.current.stepHistory).toEqual(['splash']);
  });
});
