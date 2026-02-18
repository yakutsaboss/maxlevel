/**
 * Tests for DoNotDisturbSettings component
 * (mini-app/src/components/settings/DoNotDisturbSettings.tsx)
 *
 * Run 73 Agent D: Enhanced with hour picker interactions and save callback tests.
 * Covers: toggle, hour pickers, onDndChange callback, haptic feedback,
 * conditional rendering, time display formatting.
 */

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

  // ─── Toggle tests ─────────────────────────────────────────────────

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

  it('toggle shows "on" aria label when enabled', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    const toggle = screen.getByRole('switch', { name: /do not disturb: on/i });
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggle back to disabled calls onDndChange with false', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...enabledDnd,
      dnd_enabled: false,
    });
  });

  // ─── Conditional rendering tests ──────────────────────────────────

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

  it('renders MoonStar icon', () => {
    render(<DoNotDisturbSettings dnd={disabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    expect(screen.getByTestId('moonstar-icon')).toBeInTheDocument();
  });

  // ─── Hour picker tests ────────────────────────────────────────────

  it('clicking a start hour calls onDndChange with new dnd_start', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    // Find buttons in the "From" section — each hour renders as a button
    // Click hour 23 (11 PM)
    const hourButtons = screen.getAllByText('11 PM');
    // There should be at least one in start picker; click the first one
    fireEvent.click(hourButtons[0]);

    expect(mockHaptic.selection).toHaveBeenCalled();
    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...enabledDnd,
      dnd_start: 23,
    });
  });

  it('clicking an end hour calls onDndChange with new dnd_end', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    // Click hour 6 (6 AM) — appears in both start and end pickers
    const hourButtons = screen.getAllByText('6 AM');
    // The second instance should be in the end picker
    fireEvent.click(hourButtons[hourButtons.length - 1]);

    expect(mockHaptic.selection).toHaveBeenCalled();
    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...enabledDnd,
      dnd_end: 6,
    });
  });

  it('clicking midnight (12 AM) in start picker sets dnd_start to 0', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    // 12 AM = hour 0
    const midnightButtons = screen.getAllByText('12 AM');
    fireEvent.click(midnightButtons[0]);

    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...enabledDnd,
      dnd_start: 0,
    });
  });

  it('clicking noon (12 PM) in start picker sets dnd_start to 12', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    const noonButtons = screen.getAllByText('12 PM');
    fireEvent.click(noonButtons[0]);

    expect(mockOnDndChange).toHaveBeenCalledWith({
      ...enabledDnd,
      dnd_start: 12,
    });
  });

  it('renders 24 hour buttons for start picker', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    // Each hour 0-23 appears twice (start + end picker), total = 48 hour buttons
    // We verify by checking some specific hours exist
    expect(screen.getAllByText('12 AM').length).toBe(2); // hour 0 in both pickers
    expect(screen.getAllByText('1 AM').length).toBe(2);
    expect(screen.getAllByText('12 PM').length).toBe(2);
  });

  // ─── Display formatting tests ─────────────────────────────────────

  it('displays silence period text with correct hours', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    // enabledDnd: start=22, end=8
    // formatHour(22) = "10 PM", formatHour(8) = "8 AM"
    // "10 PM" appears in both the hour picker buttons and the summary text, so use getAllByText
    expect(screen.getAllByText(/10 PM/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/8 AM/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Notifications will be silenced from 10 PM to 8 AM/)).toBeInTheDocument();
  });

  it('displays correctly for morning DND (e.g., 6 AM to 12 PM)', () => {
    const morningDnd: DndPreferences = {
      dnd_enabled: true,
      dnd_start: 6,
      dnd_end: 12,
    };

    render(<DoNotDisturbSettings dnd={morningDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    expect(screen.getByText(/Notifications will be silenced from 6 AM to 12 PM/)).toBeInTheDocument();
  });

  // ─── Haptic feedback tests ────────────────────────────────────────

  it('triggers haptic on toggle', () => {
    render(<DoNotDisturbSettings dnd={disabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    fireEvent.click(screen.getByRole('switch'));
    expect(mockHaptic.selection).toHaveBeenCalledTimes(1);
  });

  it('triggers haptic on hour selection', () => {
    render(<DoNotDisturbSettings dnd={enabledDnd} onDndChange={mockOnDndChange} haptic={mockHaptic} />);

    const hourButtons = screen.getAllByText('3 AM');
    fireEvent.click(hourButtons[0]);
    expect(mockHaptic.selection).toHaveBeenCalledTimes(1);
  });
});
