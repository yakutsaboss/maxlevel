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
  MoonStar: () => <span data-testid="moonstar-icon" />,
}));

import { DoNotDisturbSettings, type DndPreferences } from '@/components/settings/DoNotDisturbSettings';

const mockHaptic = {
  selection: vi.fn(),
  impact: vi.fn(),
};

describe('DoNotDisturbSettings', () => {
  const mockOnDndChange = vi.fn();

  const disabledDnd: DndPreferences = {
    dnd_enabled: false,
    dnd_start: 22,
    dnd_end: 8,
  };

  const enabledDnd: DndPreferences = {
    dnd_enabled: true,
    dnd_start: 22,
    dnd_end: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DND toggle', () => {
    render(<DoNotDisturbSettings dnd={disabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    expect(screen.getByText('Do Not Disturb')).toBeInTheDocument();
    expect(screen.getByText('Mute notifications during hours')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: /do not disturb: off/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('toggle calls onDndChange with flipped dnd_enabled', () => {
    render(<DoNotDisturbSettings dnd={disabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(mockHaptic.selection).toHaveBeenCalled();
    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...disabledDnd,
      dnd_enabled: true,
    });
  });

  it('hides schedule picker when disabled', () => {
    render(<DoNotDisturbSettings dnd={disabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    expect(screen.queryByText(/From/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Until/)).not.toBeInTheDocument();
  });

  it('shows schedule picker with time ranges when enabled', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    expect(screen.getByText(/From/)).toBeInTheDocument();
    expect(screen.getByText(/Until/)).toBeInTheDocument();
    expect(screen.getByText(/Notifications will be silenced/)).toBeInTheDocument();
  });
});