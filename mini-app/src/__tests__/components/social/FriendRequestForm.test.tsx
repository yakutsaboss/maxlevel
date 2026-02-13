import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Send: ({ className }: any) => <span data-testid="send-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
}));

import { FriendRequestForm } from '@/components/social/FriendRequestForm';

describe('FriendRequestForm', () => {
  const mockHaptic = { notification: vi.fn() };
  const defaultProps = {
    userId: 1,
    onSuccess: vi.fn(),
    haptic: mockHaptic,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders input and send button', () => {
    render(<FriendRequestForm {...defaultProps} />);

    expect(screen.getByText("Friend's Telegram ID")).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter Telegram ID')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
  });

  it('disables send button when input is empty', () => {
    render(<FriendRequestForm {...defaultProps} />);

    expect(screen.getByText('Send')).toBeDisabled();
  });

  it('enables send button when input has value', () => {
    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter Telegram ID'), {
      target: { value: '12345' },
    });

    expect(screen.getByText('Send')).not.toBeDisabled();
  });

  it('shows success message on successful request', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter Telegram ID'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Friend request sent!')).toBeInTheDocument();
    });

    expect(mockHaptic.notification).toHaveBeenCalledWith('success');
  });

  it('shows error message on API failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: false, message: 'User not found' }),
    } as Response);

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter Telegram ID'), {
      target: { value: '99999' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument();
    });
  });

  it('shows network error on fetch exception', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection failed'));

    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter Telegram ID'), {
      target: { value: '12345' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Network error. Try again.')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid Telegram ID', async () => {
    render(<FriendRequestForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter Telegram ID'), {
      target: { value: '-5' },
    });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid Telegram ID')).toBeInTheDocument();
    });
  });
});
