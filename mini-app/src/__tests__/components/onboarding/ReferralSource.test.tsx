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

import { ReferralSource } from '@/components/onboarding/ReferralSource';

describe('ReferralSource', () => {
  const mockOnSelect = vi.fn();
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all referral source options', () => {
    render(
      <ReferralSource
        progress={0.8}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('TikTok')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('YouTube')).toBeInTheDocument();
    expect(screen.getByText('Web')).toBeInTheDocument();
    expect(screen.getByText('Friend & Family')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('clicking an option selects it and calls onSelect', () => {
    render(
      <ReferralSource
        progress={0.8}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    fireEvent.click(screen.getByText('Instagram'));
    expect(mockOnSelect).toHaveBeenCalledWith('instagram', undefined);
  });

  it('selected option has visual highlight via className', () => {
    render(
      <ReferralSource
        progress={0.8}
        value="telegram"
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    const selectedBtn = screen.getByText('Telegram').closest('button');
    expect(selectedBtn?.className).toContain('border-telegram-link');

    const unselectedBtn = screen.getByText('YouTube').closest('button');
    expect(unselectedBtn?.className).toContain('border-transparent');
  });

  it('selecting "Other" shows text input for custom entry', () => {
    render(
      <ReferralSource
        progress={0.8}
        onSelect={mockOnSelect}
        onNext={mockOnNext}
      />
    );

    // Click "Other"
    fireEvent.click(screen.getByText('Other'));
    expect(mockOnSelect).toHaveBeenCalledWith('other', '');

    // Text input should appear
    const input = screen.getByPlaceholderText('Tell us where...');
    expect(input).toBeInTheDocument();

    // Type custom text
    fireEvent.change(input, { target: { value: 'Reddit' } });
    expect(mockOnSelect).toHaveBeenCalledWith('other', 'Reddit');
  });
});
