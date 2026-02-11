import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock @twa-dev/sdk
vi.mock('@twa-dev/sdk', () => ({
  default: {
    initData: 'test',
    initDataUnsafe: { user: { id: 123, first_name: 'TestUser' } },
    ready: vi.fn(),
    expand: vi.fn(),
    enableClosingConfirmation: vi.fn(),
    disableClosingConfirmation: vi.fn(),
    disableVerticalSwipes: vi.fn(),
    enableVerticalSwipes: vi.fn(),
    HapticFeedback: {
      impactOccurred: vi.fn(),
      notificationOccurred: vi.fn(),
      selectionChanged: vi.fn(),
    },
    colorScheme: 'dark',
    themeParams: {},
    platform: 'tdesktop',
    version: '7.0',
  },
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

// Mock ProgressBar
vi.mock('@/components/onboarding/ui/ProgressBar', () => ({
  ProgressBar: ({ progress }: { progress: number }) => (
    <div data-testid="progress-bar" data-progress={progress} />
  ),
}));

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Bell: ({ className }: any) => <span data-testid="bell-icon" className={className} />,
}));

import { NotificationPrefs } from '@/components/onboarding/NotificationPrefs';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('NotificationPrefs', () => {
  const mockOnUpdate = vi.fn();
  const mockOnNext = vi.fn();

  const defaultData: OnboardingData = {};

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 4 notification toggle rows', () => {
    render(
      <NotificationPrefs
        progress={0.9}
        data={defaultData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('Task reminders')).toBeInTheDocument();
    expect(screen.getByText('Daily summary')).toBeInTheDocument();
    expect(screen.getByText('Achievement alerts')).toBeInTheDocument();
    expect(screen.getByText('Streak warnings')).toBeInTheDocument();
  });

  it('renders descriptions for each toggle', () => {
    render(
      <NotificationPrefs
        progress={0.9}
        data={defaultData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    expect(screen.getByText('Get notified before deadlines')).toBeInTheDocument();
    expect(screen.getByText('Receive a daily recap of your progress')).toBeInTheDocument();
    expect(screen.getByText('Celebrate when you hit milestones')).toBeInTheDocument();
    expect(screen.getByText('Get warned before losing your streak')).toBeInTheDocument();
  });

  it('toggling a switch calls onUpdate with new preferences', () => {
    render(
      <NotificationPrefs
        progress={0.9}
        data={defaultData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    // All toggles default to true. Click "Task reminders" toggle to turn it off.
    // The toggle button is inside the row div — find the button within the row
    const rows = screen.getAllByRole('button');
    // First 4 buttons are the toggle buttons (the 5th is the Continue button)
    const taskReminderToggle = rows[0];
    fireEvent.click(taskReminderToggle);

    expect(mockOnUpdate).toHaveBeenCalledWith({
      quest_reminders: false,
      daily_summary: true,
      achievement_alerts: true,
      streak_warnings: true,
    });
  });

  it('clicking Continue calls onNext', () => {
    render(
      <NotificationPrefs
        progress={0.9}
        data={defaultData}
        onUpdate={mockOnUpdate}
        onNext={mockOnNext}
      />
    );

    fireEvent.click(screen.getByText('Continue'));
    expect(mockOnNext).toHaveBeenCalledTimes(1);
  });
});
