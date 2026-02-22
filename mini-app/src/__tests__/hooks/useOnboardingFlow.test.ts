import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock dependencies before importing the hook
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ user: { id: 12345 } }),
  useBackButton: vi.fn(),
}));

vi.mock('@/api/client', () => ({
  apiClient: {
    saveOnboardingState: vi.fn().mockResolvedValue({ success: true }),
    getOnboardingState: vi.fn().mockResolvedValue({ success: false }),
  },
}));

vi.mock('@/data/onboardingQuestions', () => ({
  getQuestionForStep: vi.fn().mockReturnValue(null),
}));

vi.mock('@/data/modeBadges', () => ({
  MODE_BADGES: {
    fitness: { icon: '🏋️', name: 'Fitness', color: 'bg-red-500' },
    hydration: { icon: '💧', name: 'Hydration', color: 'bg-blue-500' },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { useOnboardingFlow } from '@/hooks/useOnboardingFlow';
import { useOnboarding } from '@/hooks/useOnboarding';

describe('useOnboardingFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the Zustand store before each test
    act(() => {
      useOnboarding.getState().reset();
    });
  });

  it('returns correct initial state shape', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    expect(result.current.telegramId).toBe(12345);
    expect(result.current.saveStatus).toBe('idle');
    expect(result.current.store).toBeDefined();
    expect(result.current.store.currentStep).toBe('splash');
    expect(result.current.progress).toBe(0);
    expect(typeof result.current.goToStep).toBe('function');
    expect(typeof result.current.advanceFrom).toBe('function');
    expect(typeof result.current.handleAnswer).toBe('function');
    expect(typeof result.current.handleLaunch).toBe('function');
  });

  it('goToStep updates step in the store', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.goToStep('hero_intro');
    });

    expect(result.current.store.currentStep).toBe('hero_intro');
  });

  it('advanceFrom navigates to the next sequential step', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    // Start at splash, advance should go to hero_intro
    act(() => {
      result.current.advanceFrom('splash');
    });

    expect(result.current.store.currentStep).toBe('hero_intro');

    // Advance from hero_intro should go to avatar
    act(() => {
      result.current.advanceFrom('hero_intro');
    });

    expect(result.current.store.currentStep).toBe('avatar');
  });

  it('handleAnswer updates non-nested data correctly', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.handleAnswer('gender', undefined, 'male');
    });

    expect(result.current.store.data.gender).toBe('male');
  });

  it('handleAnswer updates nested data correctly', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.handleAnswer('fitness', 'fitness_level', 'intermediate');
    });

    expect(result.current.store.data.fitness).toBeDefined();
    expect(result.current.store.data.fitness?.fitness_level).toBe('intermediate');
  });

  it('progress calculation reflects current position in steps', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    // At splash (index 0), progress should be 0
    expect(result.current.progress).toBe(0);

    // Navigate to a later step
    act(() => {
      result.current.goToStep('hero_intro');
    });

    // Progress should increase (hero_intro is index 1 out of ~9 base steps)
    expect(result.current.progress).toBeGreaterThan(0);
  });

  it('handleLaunch marks completed and navigates to dashboard', () => {
    const { result } = renderHook(() => useOnboardingFlow());

    act(() => {
      result.current.handleLaunch();
    });

    expect(result.current.store.isCompleted).toBe(true);
    expect(result.current.store.currentStep).toBe('completed');
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
  });
});
