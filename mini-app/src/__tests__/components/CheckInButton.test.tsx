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

// Mock useCheckinMutation from React Query migration
const mockMutateAsync = vi.fn();
let mockIsPending = false;
vi.mock('@/hooks/useQuestsQuery', () => ({
  useCheckinMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
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
    mockIsPending = false;
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
    mockMutateAsync.mockResolvedValueOnce({
      completed: false,
      quest_progress: { current: 3, target: 5 },
    });

    render(<CheckInButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        telegramId: 123,
        questInstanceId: 42,
      });
    });

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalledWith({
        completed: false,
        current: 3,
        target: 5,
      });
    });
  });

  it('shows loading state when mutation is pending', () => {
    mockIsPending = true;

    render(<CheckInButton {...defaultProps} />);

    expect(screen.getByText('Checking in...')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Network error'));

    render(<CheckInButton {...defaultProps} />);
    fireEvent.click(screen.getByText('Check In'));

    await waitFor(() => {
      expect(mockHaptic.notification).toHaveBeenCalledWith('error');
    });

    // Button should return to normal state
    await waitFor(() => {
      expect(screen.getByText('Check In')).toBeInTheDocument();
    });
  });
});
