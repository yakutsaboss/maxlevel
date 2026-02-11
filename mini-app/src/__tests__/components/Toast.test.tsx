import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { framerMotionMock } from '@/test/mocks/framer-motion';

vi.mock('framer-motion', () => framerMotionMock);

vi.mock('lucide-react', () => ({
  CheckCircle: (props: any) => <span data-testid="check-icon" {...props} />,
  AlertCircle: (props: any) => <span data-testid="alert-icon" {...props} />,
  Info: (props: any) => <span data-testid="info-icon" {...props} />,
  X: (props: any) => <span data-testid="x-icon" {...props} />,
}));

import { Toast } from '@/components/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders toast message with correct variant', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Success!" variant="success" onDismiss={onDismiss} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Auto dismiss" variant="info" onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('close button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Closeable" variant="error" onDismiss={onDismiss} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
