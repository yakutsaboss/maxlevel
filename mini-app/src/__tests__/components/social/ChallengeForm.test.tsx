import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  PlusCircle: ({ className }: any) => <span data-testid="plus-icon" className={className} />,
  Loader2: ({ className }: any) => <span data-testid="loader-icon" className={className} />,
}));

import { ChallengeForm } from '@/components/social/ChallengeForm';

describe('ChallengeForm', () => {
  const mockHaptic = { notification: vi.fn() };
  const defaultProps = {
    userId: 1,
    onSuccess: vi.fn().mockResolvedValue(undefined),
    haptic: mockHaptic,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('renders form fields and submit button', () => {
    render(<ChallengeForm {...defaultProps} />);

    expect(screen.getByText('Title *')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Mode')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Challenge title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. fitness, study')).toBeInTheDocument();
    expect(screen.getByText('Create Challenge')).toBeInTheDocument();
  });

  it('disables submit button when title is empty', () => {
    render(<ChallengeForm {...defaultProps} />);

    expect(screen.getByText('Create Challenge')).toBeDisabled();
  });

  it('enables submit button when title is entered', () => {
    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Challenge title'), {
      target: { value: 'My Challenge' },
    });

    expect(screen.getByText('Create Challenge')).not.toBeDisabled();
  });

  it('shows success message on successful creation', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: true }),
    } as Response);

    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Challenge title'), {
      target: { value: 'My Challenge' },
    });
    fireEvent.click(screen.getByText('Create Challenge'));

    await waitFor(() => {
      expect(screen.getByText('Challenge created!')).toBeInTheDocument();
    });

    expect(mockHaptic.notification).toHaveBeenCalledWith('success');
    expect(defaultProps.onSuccess).toHaveBeenCalled();
  });

  it('shows error message on API failure', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValueOnce({
      json: async () => ({ success: false, message: 'Server error' }),
    } as Response);

    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Challenge title'), {
      target: { value: 'My Challenge' },
    });
    fireEvent.click(screen.getByText('Create Challenge'));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('shows network error message on fetch exception', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValueOnce(new Error('Connection failed'));

    render(<ChallengeForm {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Challenge title'), {
      target: { value: 'My Challenge' },
    });
    fireEvent.click(screen.getByText('Create Challenge'));

    await waitFor(() => {
      expect(screen.getByText('Network error. Try again.')).toBeInTheDocument();
    });
  });
});
