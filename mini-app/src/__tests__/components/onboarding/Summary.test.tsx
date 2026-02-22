import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'TestUser' } },
    ready: vi.fn(),
    expand: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
  },
}));

import { framerMotionMock } from '@/test/mocks/framer-motion';
vi.mock('framer-motion', () => framerMotionMock);

import { Summary } from '@/components/onboarding/Summary';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('Summary', () => {
  const mockOnEdit = vi.fn();
  const mockOnNext = vi.fn();

  const baseData: OnboardingData = {
    nickname: 'Hero123',
    gender: 'gym_warrior',
    selected_modes: ['fitness', 'hydration'],
    fitness: {
      fitness_level: 'intermediate',
      workout_frequency: 3,
      focus_areas: ['arms', 'legs', 'core'],
    },
    hydration: {
      daily_target: 8,
      reminder_frequency: '2h',
    },
    punishments: {
      consent_given: true,
      punishment_type: 'workout',
      difficulty: 'medium',
      safe_mode: false,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders selected modes with badges', () => {
    render(
      <Summary
        progress={0.9}
        stepLabel="Summary"
        data={baseData}
        onEdit={mockOnEdit}
        onNext={mockOnNext}
      />
    );

    // Should display mode badges for fitness and hydration
    // Use getAllByText since mode name appears in both badge and section card
    expect(screen.getAllByText(/Fitness/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Hydration/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders avatar selection in hero card', () => {
    render(
      <Summary
        progress={0.9}
        data={baseData}
        onEdit={mockOnEdit}
        onNext={mockOnNext}
      />
    );

    // Hero card should show nickname and avatar label
    expect(screen.getByText('Hero123')).toBeInTheDocument();
    expect(screen.getByText('Gym Warrior')).toBeInTheDocument();
  });

  it('renders quiz answers summary for each mode', () => {
    render(
      <Summary
        progress={0.9}
        data={baseData}
        onEdit={mockOnEdit}
        onNext={mockOnNext}
      />
    );

    // Fitness summary: "intermediate level | 3x/week | arms, legs, core"
    expect(screen.getByText(/intermediate level/)).toBeInTheDocument();
    expect(screen.getByText(/3x\/week/)).toBeInTheDocument();

    // Hydration summary: "8 glasses/day | every 2h"
    expect(screen.getByText(/8 glasses\/day/)).toBeInTheDocument();
  });

  it('renders "Let\'s Start!" CTA button and fires onNext', () => {
    render(
      <Summary
        progress={0.9}
        data={baseData}
        onEdit={mockOnEdit}
        onNext={mockOnNext}
      />
    );

    const startButton = screen.getByText("Let's Start!");
    expect(startButton).toBeInTheDocument();

    fireEvent.click(startButton);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });

  it('handles empty state with no modes selected', () => {
    const emptyData: OnboardingData = {
      selected_modes: [],
    };

    render(
      <Summary
        progress={0.9}
        data={emptyData}
        onEdit={mockOnEdit}
        onNext={mockOnNext}
      />
    );

    // Should still render the page title and CTA
    expect(screen.getByText('Almost Done!')).toBeInTheDocument();
    expect(screen.getByText("Let's Start!")).toBeInTheDocument();
    // Should show "No accountability enabled" for punishments
    expect(screen.getByText('No accountability enabled')).toBeInTheDocument();
  });
});
