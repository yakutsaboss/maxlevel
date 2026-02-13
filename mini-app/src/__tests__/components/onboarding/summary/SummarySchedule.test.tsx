import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { SummarySchedule } from '@/components/onboarding/summary/SummarySchedule';
import type { OnboardingData } from '@/hooks/useOnboarding';

describe('SummarySchedule', () => {
  const mockOnEdit = vi.fn();

  it('renders Accountability and Notifications sections', () => {
    const data: OnboardingData = {};
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('Accountability')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows "No accountability enabled" when consent not given', () => {
    const data: OnboardingData = {
      punishments: { consent_given: false },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('No accountability enabled')).toBeInTheDocument();
  });

  it('shows "No accountability enabled" when punishments is undefined', () => {
    const data: OnboardingData = {};
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('No accountability enabled')).toBeInTheDocument();
  });

  it('shows punishment summary when consent is given with workout type', () => {
    const data: OnboardingData = {
      punishments: {
        consent_given: true,
        punishment_type: 'workout',
        difficulty: 'medium',
        safe_mode: false,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Workout/)).toBeInTheDocument();
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
    expect(screen.getByText(/50 pushups/)).toBeInTheDocument();
  });

  it('shows punishment summary with safe mode indicator', () => {
    const data: OnboardingData = {
      punishments: {
        consent_given: true,
        punishment_type: 'book',
        difficulty: 'easy',
        safe_mode: true,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Book/)).toBeInTheDocument();
    expect(screen.getByText(/Safe Mode ON/)).toBeInTheDocument();
  });

  it('shows money punishment summary', () => {
    const data: OnboardingData = {
      punishments: {
        consent_given: true,
        punishment_type: 'money',
        difficulty: 'hard',
        safe_mode: false,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Money/)).toBeInTheDocument();
    expect(screen.getByText(/\$10/)).toBeInTheDocument();
  });

  it('falls back to intensity_level when difficulty is missing', () => {
    const data: OnboardingData = {
      punishments: {
        consent_given: true,
        punishment_type: 'workout',
        intensity_level: 'extreme',
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Extreme/)).toBeInTheDocument();
    expect(screen.getByText(/200 pushups/)).toBeInTheDocument();
  });

  it('shows "All enabled" when notification_preferences is undefined', () => {
    const data: OnboardingData = {};
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('All enabled')).toBeInTheDocument();
  });

  it('shows notification count when preferences are set', () => {
    const data: OnboardingData = {
      notification_preferences: {
        quest_reminders: true,
        daily_summary: true,
        achievement_alerts: false,
        streak_warnings: false,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('2/4 enabled')).toBeInTheDocument();
  });

  it('shows 0/4 when all notifications disabled', () => {
    const data: OnboardingData = {
      notification_preferences: {
        quest_reminders: false,
        daily_summary: false,
        achievement_alerts: false,
        streak_warnings: false,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('0/4 enabled')).toBeInTheDocument();
  });

  it('shows 4/4 when all notifications enabled', () => {
    const data: OnboardingData = {
      notification_preferences: {
        quest_reminders: true,
        daily_summary: true,
        achievement_alerts: true,
        streak_warnings: true,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText('4/4 enabled')).toBeInTheDocument();
  });

  it('calls onEdit with "punishments" when Accountability edit is clicked', () => {
    const data: OnboardingData = {};
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]); // Accountability edit
    expect(mockOnEdit).toHaveBeenCalledWith('punishments');
  });

  it('calls onEdit with "notifications" when Notifications edit is clicked', () => {
    const data: OnboardingData = {};
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[1]); // Notifications edit
    expect(mockOnEdit).toHaveBeenCalledWith('notifications');
  });

  it('handles consent_given true with null punishment_type', () => {
    const data: OnboardingData = {
      punishments: {
        consent_given: true,
        punishment_type: null,
      },
    };
    render(<SummarySchedule data={data} onEdit={mockOnEdit} />);

    expect(screen.getByText(/Enabled/)).toBeInTheDocument();
  });
});
