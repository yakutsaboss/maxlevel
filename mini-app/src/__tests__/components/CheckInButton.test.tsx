import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, onClick, disabled, className, ...props }: any) => (
      <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock useTelegram hook
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic }),
}));

// Mock apiClient
const mockCreateCheckin = vi.fn();
vi.mock('@/api/client', () => ({
  apiClient: {
    createCheckin: (...args: any[]) => mockCreateCheckin(...args),
  },
}));

import { CheckInButton } from '@/components/CheckInButton';

const defaultProps = {
  questInstanceId: 42,
  telegramId: 123,
  onSuccess: vi.fn(),
};

describe('CheckInButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders check-in button with default text', () => {
    render(<CheckInButton {...defaultProps} />);

    expect(screen.getByText('Check In')).toBeInTheDocument();
  });

  it('shows remaining count when currentProgress and target are provided', () => {
    render(<CheckInButton {...defaultProps} currentProgress={2} target={5} />);

    expect(screen.getByText('Check In (3 left)')).toBeInTheDocument();
  });

  it('calls API and onSuccess on click', async () => {
    mockCreateCheckin.mockResolvedValueOnce({
      success: true,
      data: {
        completed: false,
        quest_progress: { current: 3, target: 5 },
      },
    });

    render(<CheckInButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(mockCreateCheckin).toHaveBeenCalledWith(123, 42);
    });

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith({
        completed: false,
        current: 3,
        target: 5,
      });
    });
  });

  it('shows loading state during check-in', async () => {
    // Create a promise we control to keep loading state visible
    let resolveCheckin!: (value: any) => void;
    mockCreateCheckin.mockReturnValueOnce(
      new Promise((resolve) => { resolveCheckin = resolve; })
    );

    render(<CheckInButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(screen.getByText('Checking in...')).toBeInTheDocument();
    });

    // Resolve to clean up
    resolveCheckin({ success: true, data: { completed: false, quest_progress: { current: 1, target: 1 } } });
  });

  it('handles API error gracefully', async () => {
    mockCreateCheckin.mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(<CheckInButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(mockHaptic.notification).toHaveBeenCalledWith('error');
    });

    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Check In')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});
