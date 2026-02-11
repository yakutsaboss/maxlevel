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

// Mock ProgressBar
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Pencil: ({ className }: any) => <span data-testid="pencil-icon" className={className} />,
  Check: ({ className }: any) => <span data-testid="check-icon" className={className} />,
}));

import { HeroIntro } from '@/components/onboarding/HeroIntro';

describe('HeroIntro', () => {
  const mockOnNicknameChange = vi.fn();
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the user display name from nickname prop', () => {
    render(
      <HeroIntro
        progress={0.1}
        nickname="Hero123"
        onNicknameChange={mockOnNicknameChange}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('Hero123')).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(
      <HeroIntro
        progress={0.1}
        onNicknameChange={mockOnNicknameChange}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText("Ready to improve your life? Let's set up your personal plan!")).toBeInTheDocument();
  });

  it('renders "Let\'s Go!" CTA button', () => {
    render(
      <HeroIntro
        progress={0.1}
        onNicknameChange={mockOnNicknameChange}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText("Let's Go!")).toBeInTheDocument();
  });

  it('clicking CTA calls onNext', () => {
    render(
      <HeroIntro
        progress={0.1}
        onNicknameChange={mockOnNicknameChange}
        onNext={mockOnNext}
      />
    );

    fireEvent.click(screen.getByText("Let's Go!"));
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
