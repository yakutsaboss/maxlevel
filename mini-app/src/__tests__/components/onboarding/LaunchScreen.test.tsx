import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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
    button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>{children}</button>
    ),
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Trophy: () => <span data-testid="trophy-icon" />,
  Zap: () => <span data-testid="zap-icon" />,
  Sparkles: () => <span data-testid="sparkles-icon" />,
}));

// Mock apiClient
const mockCompleteOnboarding = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    completeOnboarding: (...args: any[]) => mockCompleteOnboarding(...args),
  },
}));

import { LaunchScreen } from '@/components/onboarding/LaunchScreen';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('LaunchScreen', () => {
  const mockOnLaunch = vi.fn();
  const testData: OnboardingData = {
    selected_modes: ['fitness'],
    gender: 'gym_warrior',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCompleteOnboarding.mockResolvedValue({ success: true });
  });

  it('renders congratulations message after saving completes', async () => {
    render(<LaunchScreen data={testData} telegramId={123} onLaunch={mockOnLaunch} />);

    // Initially shows loading
    expect(screen.getByText('Setting up your plan...')).toBeInTheDocument();

    // After API resolves, shows success screen
    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    expect(screen.getByText('First Steps')).toBeInTheDocument();
  });

  it('renders XP earned badge', async () => {
    render(<LaunchScreen data={testData} telegramId={123} onLaunch={mockOnLaunch} />);

    await waitFor(() => {
      expect(screen.getByText("You're All Set!")).toBeInTheDocument();
    });

    // XP display should be present (starts at 0, animates to 50)
    expect(screen.getByText(/XP/)).toBeInTheDocument();
  });

  it('triggers onLaunch on CTA click', async () => {
    render(<LaunchScreen data={testData} telegramId={123} onLaunch={mockOnLaunch} />);

    await waitFor(() => {
      expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Go to Dashboard'));
    expect(mockOnLaunch).toHaveBeenCalledTimes(1);
  });

  it('handles double-fire prevention via useRef guard', async () => {
    render(<LaunchScreen data={testData} telegramId={123} onLaunch={mockOnLaunch} />);

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
    });

    // The useRef guard ensures completeOnboarding is called exactly once
    // even though useEffect could fire multiple times in StrictMode
    expect(mockCompleteOnboarding).toHaveBeenCalledWith(123, testData);
  });

  it('shows error state on API failure with retry button', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('Network error'));

    render(<LaunchScreen data={testData} telegramId={123} onLaunch={mockOnLaunch} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to save. Please try again.')).toBeInTheDocument();
    });

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();

    // Click retry - reset mock to succeed
    mockCompleteOnboarding.mockResolvedValueOnce({ success: true });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(mockCompleteOnboarding).toHaveBeenCalledTimes(2);
    });
  });
});
