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
    button: ({ children, onClick, className, disabled, ...props }: any) => (
      <button onClick={onClick} className={className} disabled={disabled} {...props}>{children}</button>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  TrendingUp: ({ className }: any) => <span data-testid="trending-up-icon" className={className} />,
}));

import { SplashScreen } from '@/components/onboarding/SplashScreen';

describe('SplashScreen', () => {
  const mockOnNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders app branding (title and tagline)', () => {
    render(<SplashScreen onNext={mockOnNext} />);

    expect(screen.getByText('MaxLevel')).toBeInTheDocument();
    expect(screen.getByText('Level up your real life')).toBeInTheDocument();
  });

  it('renders "Get Started" button', () => {
    render(<SplashScreen onNext={mockOnNext} />);

    expect(screen.getByText('Get Started')).toBeInTheDocument();
  });

  it('renders language options with flags', () => {
    render(<SplashScreen onNext={mockOnNext} />);

    // Three language flags
    expect(screen.getByText('🇺🇸')).toBeInTheDocument();
    expect(screen.getByText('🇷🇺')).toBeInTheDocument();
    expect(screen.getByText('🇨🇳')).toBeInTheDocument();
  });

  it('Get Started is disabled until language is selected, then calls onNext', () => {
    render(<SplashScreen onNext={mockOnNext} />);

    const startBtn = screen.getByText('Get Started');

    // Disabled before selection
    expect(startBtn).toBeDisabled();

    // Click English flag
    fireEvent.click(screen.getByText('🇺🇸'));

    // Now enabled
    expect(startBtn).not.toBeDisabled();

    // Click calls onNext
    fireEvent.click(startBtn);
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
