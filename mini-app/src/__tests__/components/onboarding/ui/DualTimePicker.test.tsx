import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock DrumRoller to isolate DualTimePicker tests
vi.mock('@/components/onboarding/ui/DrumRoller', () => ({
  DrumRoller: ({ min, max, value, onChange, formatLabel }: any) => (
    <div data-testid={`drum-${min}-${max}`}>
      <span>{formatLabel ? formatLabel(value) : value}</span>
      <button onClick={() => onChange(value + 1)}>change-{min}</button>
    </div>
  ),
}));

import { DualTimePicker } from '@/components/onboarding/ui/DualTimePicker';

describe('DualTimePicker', () => {
  const mockOnWakeChange = vi.fn();
  const mockOnSleepChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders wake and sleep time labels', () => {
    render(
      <DualTimePicker
        wakeTime={7}
        sleepTime={23}
        onWakeChange={mockOnWakeChange}
        onSleepChange={mockOnSleepChange}
      />
    );
    expect(screen.getByText('Wake up')).toBeInTheDocument();
    expect(screen.getByText('Sleep')).toBeInTheDocument();
  });

  it('displays formatted wake and sleep times', () => {
    render(
      <DualTimePicker
        wakeTime={7}
        sleepTime={23}
        onWakeChange={mockOnWakeChange}
        onSleepChange={mockOnSleepChange}
      />
    );
    // Wake time: 07:00
    expect(screen.getByText('07:00')).toBeInTheDocument();
    // Sleep time: 23:00
    expect(screen.getByText('23:00')).toBeInTheDocument();
  });

  it('calls onChange handlers when time changes', () => {
    render(
      <DualTimePicker
        wakeTime={7}
        sleepTime={23}
        onWakeChange={mockOnWakeChange}
        onSleepChange={mockOnSleepChange}
      />
    );
    // Click the wake change button (min=5 drum)
    const wakeButton = screen.getByText('change-5');
    wakeButton.click();
    expect(mockOnWakeChange).toHaveBeenCalledWith(8);

    // Click the sleep change button (min=20 drum)
    const sleepButton = screen.getByText('change-20');
    sleepButton.click();
    expect(mockOnSleepChange).toHaveBeenCalledWith(24);
  });
});
