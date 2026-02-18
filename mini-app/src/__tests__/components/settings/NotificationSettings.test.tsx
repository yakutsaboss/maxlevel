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
  Bell: () => <span data-testid="bell-icon" />,
  Clock: () => <span data-testid="clock-icon" />,
  Globe: () => <span data-testid="globe-icon" />,
}));

import { NotificationSettings, type UserPreferences } from '@/components/settings/NotificationSettings';

const defaultPrefs: UserPreferences = {
  notifications_enabled: true,
  reminder_time: 9,
  timezone: 'Europe/Moscow',
  dnd_enabled: false,
  dnd_start: 22,
  dnd_end: 8,
  notification_modes: {
    fitness: true,
    hydration: true,
    finance: true,
    learning: true,
    medication: true,
    habits: true,
  },
};

const mockHaptic = {
  selection: vi.fn(),
  impact: vi.fn(),
};

describe('NotificationSettings', () => {
  const mockOnPrefsChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification toggle with enabled state', () => {
    render(<NotificationSettings prefs={defaultPrefs} onPrefsChange={mockOnPrefsChange} haptic={mockHaptic} />);

    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Daily reminders & updates')).toBeInTheDocument();
    const toggle = screen.getByRole('switch', { name: /notifications: on/i });
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('toggle calls onPrefsChange with flipped notifications_enabled', () => {
    render(<NotificationSettings prefs={defaultPrefs} onPrefsChange={mockOnPrefsChange} haptic={mockHaptic} />);

    fireEvent.click(screen.getByRole('switch', { name: /notifications/i }));
    expect(mockHaptic.selection).toHaveBeenCalled();
    expect(mockOnPrefsChange).toHaveBeenCalledWith({
      ...defaultPrefs,
      notifications_enabled: false,
    });
  });

  it('renders disabled state correctly', () => {
    const disabledPrefs = { ...defaultPrefs, notifications_enabled: false };
    render(<NotificationSettings prefs={disabledPrefs} onPrefsChange={mockOnPrefsChange} haptic={mockHaptic} />);

    const toggle = screen.getByRole('switch', { name: /notifications: off/i });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('renders reminder time selector with hour buttons', () => {
    render(<NotificationSettings prefs={defaultPrefs} onPrefsChange={mockOnPrefsChange} haptic={mockHaptic} />);

    expect(screen.getByText('Reminder Time')).toBeInTheDocument();
    expect(screen.getByText('When to send daily reminder')).toBeInTheDocument();
  });

  it('renders timezone input with auto-detect button', () => {
    render(<NotificationSettings prefs={defaultPrefs} onPrefsChange={mockOnPrefsChange} haptic={mockHaptic} />);

    expect(screen.getByText('Timezone')).toBeInTheDocument();
    const input = screen.getByRole('textbox', { name: /timezone/i });
    expect(input).toHaveValue('Europe/Moscow');
    expect(screen.getByText('Auto-detect timezone')).toBeInTheDocument();
  });
});