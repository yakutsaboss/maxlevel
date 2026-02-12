import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, className, disabled, type, onClick, ...props }: any) => (
      <button className={className} disabled={disabled} type={type} onClick={onClick}>{children}</button>
    ),
    div: ({ children, className, ...props }: any) => (
      <div className={className}>{children}</div>
    ),
  },
}));

import { HabitBuilder } from '@/components/habits/HabitBuilder';

describe('HabitBuilder', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all sections', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    expect(screen.getByText('Habit name')).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Frequency')).toBeInTheDocument();
    expect(screen.getByText('Reminder time')).toBeInTheDocument();
  });

  it('shows "Create Habit" button by default', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    expect(screen.getByText('Create Habit')).toBeInTheDocument();
  });

  it('shows "Save Changes" button when initialHabit is provided', () => {
    render(<HabitBuilder onSave={mockOnSave} initialHabit={{ name: 'Run' }} />);

    expect(screen.getByText('Save Changes')).toBeInTheDocument();
  });

  it('submit button is disabled when habit name is empty', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    const submitBtn = screen.getByText('Create Habit');
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled when habit name is entered', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('e.g. Morning run');
    fireEvent.change(input, { target: { value: 'Meditate' } });

    expect(screen.getByText('Create Habit')).not.toBeDisabled();
  });

  it('calls onSave with correct data on submit', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('e.g. Morning run');
    fireEvent.change(input, { target: { value: 'Meditate' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(mockOnSave).toHaveBeenCalledWith({
      name: 'Meditate',
      frequency: 'daily',
      reminderTime: '09:00',
      icon: '\uD83C\uDFAF',
    });
  });

  it('renders all frequency options', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    expect(screen.getByText('Every day')).toBeInTheDocument();
    expect(screen.getByText('Weekdays only')).toBeInTheDocument();
    expect(screen.getByText('Custom')).toBeInTheDocument();
  });

  it('renders emoji grid for icon selection', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    const emojis = ['\uD83C\uDFC3', '\uD83D\uDCDA', '\uD83D\uDCAA', '\uD83E\uDDD8', '\uD83D\uDCA7', '\uD83C\uDFAF'];
    emojis.forEach((emoji) => {
      expect(screen.getByText(emoji)).toBeInTheDocument();
    });
  });

  it('pre-fills values when initialHabit is provided', () => {
    render(
      <HabitBuilder
        onSave={mockOnSave}
        initialHabit={{ name: 'Run', frequency: 'weekdays', reminderTime: '07:30' }}
      />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Morning run') as HTMLInputElement;
    expect(nameInput.value).toBe('Run');

    const timeInput = screen.getByDisplayValue('07:30');
    expect(timeInput).toBeInTheDocument();
  });

  it('does not call onSave when name is only whitespace', () => {
    render(<HabitBuilder onSave={mockOnSave} />);

    const input = screen.getByPlaceholderText('e.g. Morning run');
    fireEvent.change(input, { target: { value: '   ' } });

    const form = input.closest('form')!;
    fireEvent.submit(form);

    expect(mockOnSave).not.toHaveBeenCalled();
  });
});
