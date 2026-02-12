import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useTelegram hook
const mockHaptic = {
  impact: vi.fn(),
  notification: vi.fn(),
  selection: vi.fn(),
};
vi.mock('@/hooks/useTelegram', () => ({
  useTelegram: () => ({ haptic: mockHaptic }),
}));

import { DaySelector } from '@/components/onboarding/ui/DaySelector';

describe('DaySelector', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all 7 day buttons', () => {
    render(<DaySelector selected={[]} onChange={mockOnChange} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
    // Labels: M T W T F S S
    expect(buttons[0]).toHaveTextContent('M');
    expect(buttons[4]).toHaveTextContent('F');
  });

  it('toggles selection on click', () => {
    const { rerender } = render(
      <DaySelector selected={[]} onChange={mockOnChange} />
    );
    // Select monday
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockOnChange).toHaveBeenCalledWith(['mon']);

    // Now deselect monday
    mockOnChange.mockClear();
    rerender(<DaySelector selected={['mon']} onChange={mockOnChange} />);
    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('calls onChange with updated days and respects requiredCount limit', () => {
    render(
      <DaySelector selected={['mon', 'tue']} onChange={mockOnChange} requiredCount={2} />
    );
    // At limit: unselected buttons should be disabled
    const wedButton = screen.getAllByRole('button')[2]; // W
    expect(wedButton).toBeDisabled();

    // Clicking disabled button should not call onChange
    fireEvent.click(wedButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });
});
