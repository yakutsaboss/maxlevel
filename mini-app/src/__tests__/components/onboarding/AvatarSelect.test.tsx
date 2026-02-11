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
}));

// Mock ProgressBar and ContinueButton
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

vi.mock('@/components/onboarding/ui/ContinueButton', () => ({
  ContinueButton: ({ onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="continue-btn">
      Continue
    </button>
  ),
}));

import { AvatarSelect } from '@/components/onboarding/AvatarSelect';

describe('AvatarSelect', () => {
  const mockOnSelect = vi.fn();
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 5 avatar options with labels and descriptions', () => {
    render(
      <AvatarSelect
        progress={0.3}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('Gym Warrior')).toBeInTheDocument();
    expect(screen.getByText('Office Boss')).toBeInTheDocument();
    expect(screen.getByText('Magic Pet')).toBeInTheDocument();
    expect(screen.getByText('Night Owl')).toBeInTheDocument();
    expect(screen.getByText('Couch Hero')).toBeInTheDocument();

    expect(screen.getByText('Lives for the grind')).toBeInTheDocument();
    expect(screen.getByText('Peak performance after midnight')).toBeInTheDocument();
  });

  it('clicking an avatar calls onSelect with its value', () => {
    render(
      <AvatarSelect
        progress={0.3}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    fireEvent.click(screen.getByText('Night Owl'));
    expect(mockOnSelect).toHaveBeenCalledWith('night_owl');
  });

  it('selected avatar has visual highlight via className', () => {
    render(
      <AvatarSelect
        progress={0.3}
        value="gym_warrior"
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    const selectedBtn = screen.getByText('Gym Warrior').closest('button');
    expect(selectedBtn?.className).toContain('border-telegram-link');

    const unselectedBtn = screen.getByText('Night Owl').closest('button');
    expect(unselectedBtn?.className).toContain('border-transparent');
  });

  it('continue button is disabled when no avatar is selected', () => {
    render(
      <AvatarSelect
        progress={0.3}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn).toBeDisabled();
  });

  it('continue button is enabled after selecting an avatar', () => {
    render(
      <AvatarSelect
        progress={0.3}
        value="magic_pet"
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    const continueBtn = screen.getByTestId('continue-btn');
    expect(continueBtn).not.toBeDisabled();
  });
});
