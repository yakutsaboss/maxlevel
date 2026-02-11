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

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, onClick, className, ...props }: any) => (
      <button onClick={onClick} className={className} {...props}>{children}</button>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock ProgressBar
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Skull: () => <span data-testid="skull-icon" />,
}));

import { PunishmentConfig } from '@/components/onboarding/PunishmentConfig';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('PunishmentConfig', () => {
  const mockOnUpdate = vi.fn();
  const mockOnNext = vi.fn();

  const baseData: OnboardingData = {
    selected_modes: ['fitness'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders consent toggle', () => {
    render(
      <PunishmentConfig
        progress={0.8}
        data={baseData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('Enable accountability')).toBeInTheDocument();
    expect(screen.getByText('Accountability')).toBeInTheDocument();
    // Skip for Now button should be visible when consent is off
    expect(screen.getByText('Skip for Now')).toBeInTheDocument();
  });

  it('renders type selector when consent is toggled on', () => {
    render(
      <PunishmentConfig
        progress={0.8}
        data={baseData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    // Toggle consent on — the ConsentToggle has a button sibling to the text container
    // Navigate up to the wrapper div that contains both text and toggle button
    const consentWrapper = screen.getByText('Enable accountability').closest('.bg-telegram-secondaryBg')!;
    const toggleButton = consentWrapper.querySelector('button')!;
    fireEvent.click(toggleButton);

    // Now type selector should be visible
    expect(screen.getByText('Choose your punishment type')).toBeInTheDocument();
    expect(screen.getByText('Workout')).toBeInTheDocument();
    expect(screen.getByText('Book')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
  });

  it('renders difficulty selector after selecting a type', () => {
    // Start with consent already given and type selected
    const dataWithPunishment: OnboardingData = {
      ...baseData,
      punishments: {
        consent_given: true,
        punishment_type: 'workout',
        difficulty: 'easy',
      },
    };

    render(
      <PunishmentConfig
        progress={0.8}
        data={dataWithPunishment}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    // Difficulty options should be visible
    expect(screen.getByText('20 pushups')).toBeInTheDocument();
    expect(screen.getByText('50 pushups')).toBeInTheDocument();
    expect(screen.getByText('100 pushups')).toBeInTheDocument();

    // Safe Mode toggle should be present
    expect(screen.getByText('Safe Mode')).toBeInTheDocument();

    // "Enable & Continue" button should be visible
    expect(screen.getByText('Enable & Continue')).toBeInTheDocument();
  });

  it('calls onUpdate and onNext when Skip for Now is clicked', () => {
    render(
      <PunishmentConfig
        progress={0.8}
        data={baseData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    fireEvent.click(screen.getByText('Skip for Now'));
    expect(mockOnUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ consent_given: false })
    );
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
