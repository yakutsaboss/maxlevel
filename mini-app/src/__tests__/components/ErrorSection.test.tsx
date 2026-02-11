import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useTelegram
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic }),
}));

import { ErrorSection } from '@/components/ErrorSection';

describe('ErrorSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error message', () => {
    render(<ErrorSection message="Failed to load data" onRetry={vi.fn()} />);

    expect(screen.getByText('Failed to load data')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('retry button calls onRetry callback', () => {
    const onRetry = vi.fn();
    render(<ErrorSection message="Network error" onRetry={onRetry} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic feedback on retry', () => {
    render(<ErrorSection message="Error" onRetry={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
    expect(mockHaptic.impact).toHaveBeenCalledWith('light');
  });

  it('renders with role="alert" for accessibility', () => {
    render(<ErrorSection message="Server error" onRetry={vi.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
