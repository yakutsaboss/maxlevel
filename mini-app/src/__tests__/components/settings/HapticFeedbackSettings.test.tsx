import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Vibrate: () => <span data-testid="vibrate-icon" />,
}));

// Mock setHapticEnabled
vi.mock('@/hooks/useTelegram', () => ({
  setHapticEnabled: vi.fn(),
}));

import { HapticFeedbackSettings } from '@/components/settings/HapticFeedbackSettings';

describe('HapticFeedbackSettings', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders haptic toggle with label', () => {
    render(<HapticFeedbackSettings enabled={false} onChange={mockOnChange} />);

    expect(screen.getByText('Haptic Feedback')).toBeInTheDocument();
    expect(screen.getByText('Vibration on button taps')).toBeInTheDocument();
  });

  it('toggle calls onChange with flipped value', () => {
    render(<HapticFeedbackSettings enabled={false} onChange={mockOnChange} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  it('shows correct enabled/disabled aria state', () => {
    const { rerender } = render(<HapticFeedbackSettings enabled={false} onChange={mockOnChange} />);

    const toggle = screen.getByRole('switch', { name: /haptic feedback: off/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    rerender(<HapticFeedbackSettings enabled={true} onChange={mockOnChange} />);

    const toggleOn = screen.getByRole('switch', { name: /haptic feedback: on/i });
    expect(toggleOn).toHaveAttribute('aria-checked', 'true');
  });
});
